"""
LangChain Agent + Tools para auditoría de facturas de siniestros.
Flujo:
  1. GPT-4o-mini Vision → extrae ítems estructurados (imagen/PDF)
  2. AgentExecutor con 2 tools:
       • consultar_tarifario        → Supabase
       • registrar_dictamen_notion  → Notion
  3. Devuelve JSON con dictamen, ítems auditados y URL de Notion

Optimización de tokens:
  - Modelo configurable vía OPENAI_MODEL (default: gpt-4o-mini, ~17x más barato que gpt-4o)
  - max_tokens acotado en cada llamada
  - Prompts compactos: misma semántica, menos tokens
  - max_iterations=12 (suficiente para facturas de hasta ~10 ítems)
"""

from __future__ import annotations

import asyncio
import base64
import json
import os
from datetime import datetime
from typing import Any

from langchain.agents import AgentExecutor, create_openai_tools_agent
from langchain.tools import tool
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_openai import ChatOpenAI
from notion_client import Client as NotionClient
from openai import AsyncOpenAI
from pydantic import BaseModel, Field
from supabase import Client, create_client


# ── Clientes (lazy) ────────────────────────────────────────────────────────────

def _supabase() -> Client:
    return create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_KEY"])

def _notion() -> NotionClient:
    return NotionClient(auth=os.environ["NOTION_TOKEN"])

def _model() -> str:
    return os.environ.get("OPENAI_MODEL", "gpt-4o-mini")


# ── Tool schemas ───────────────────────────────────────────────────────────────

class ConsultarTarifarioInput(BaseModel):
    descripcion: str = Field(description="Descripción del ítem a buscar en el tarifario")
    precio_cobrado: float = Field(description="Precio cobrado en la factura")

class RegistrarDictamenInput(BaseModel):
    numero_factura: str = Field(description="Número de la factura")
    taller: str = Field(description="Nombre del taller")
    total_facturado: float = Field(description="Total de la factura")
    dictamen: str = Field(
        description="Uno de: 'Aprobado', 'Alerta - Sobreprecio', "
                    "'Alerta - Ítem No Tarifado', 'Rechazado - Cobro Duplicado'"
    )
    observaciones: str = Field(description="Detalle de discrepancias o confirmación de conformidad")


# ── Tool 1: Supabase ───────────────────────────────────────────────────────────

@tool("consultar_tarifario", args_schema=ConsultarTarifarioInput)
def consultar_tarifario(descripcion: str, precio_cobrado: float) -> str:
    """Verifica en Supabase si el precio cobrado de un ítem supera el máximo del tarifario."""
    try:
        result = (
            _supabase()
            .table("tarifario")
            .select("descripcion, precio_maximo, unidad")
            .ilike("descripcion", f"%{descripcion}%")
            .limit(1)
            .execute()
        )
        if not result.data:
            return json.dumps({
                "encontrado": False, "alerta": True,
                "tipo_alerta": "ITEM_NO_TARIFADO",
                "mensaje": f"'{descripcion}' no está en el tarifario.",
            })
        item = result.data[0]
        precio_max = float(item["precio_maximo"])
        diff = round(precio_cobrado - precio_max, 2)
        over = diff > 0
        return json.dumps({
            "encontrado": True,
            "descripcion_tarifario": item["descripcion"],
            "precio_cobrado": precio_cobrado,
            "precio_maximo": precio_max,
            "alerta": over,
            "tipo_alerta": "SOBREPRECIO" if over else None,
            "diferencia": diff,
            "mensaje": (
                f"SOBREPRECIO: cobrado ${precio_cobrado:.2f} vs max ${precio_max:.2f} (+${diff:.2f})"
                if over else f"OK: ${precio_cobrado:.2f} ≤ max ${precio_max:.2f}"
            ),
        })
    except Exception as exc:
        err = str(exc)
        # Error 42703 = columna inexistente → la tabla no coincide con el schema esperado.
        # Devolvemos ERROR_SCHEMA para que el agente sepa que no debe reintentar.
        if "42703" in err or "does not exist" in err:
            return json.dumps({
                "encontrado": False,
                "alerta": True,
                "tipo_alerta": "ERROR_SCHEMA",
                "mensaje": (
                    "ERROR_SCHEMA: La tabla 'tarifario' no tiene el esquema esperado. "
                    "NO vuelvas a llamar a esta herramienta. "
                    "Marca todos los ítems pendientes como NO_TARIFADO y continúa."
                ),
            })
        return json.dumps({"error": err, "alerta": True, "tipo_alerta": "ERROR_TOOL"})


# ── Tool 2: Notion ─────────────────────────────────────────────────────────────

_VALID_DICTAMENES = {
    "Aprobado",
    "Alerta - Sobreprecio",
    "Alerta - Ítem No Tarifado",
    "Rechazado - Cobro Duplicado",
}

@tool("registrar_dictamen_notion", args_schema=RegistrarDictamenInput)
def registrar_dictamen_notion(
    numero_factura: str,
    taller: str,
    total_facturado: float,
    dictamen: str,
    observaciones: str,
) -> str:
    """Inserta el dictamen de auditoría en la base de datos de Notion."""
    if dictamen not in _VALID_DICTAMENES:
        dictamen = "Alerta - Sobreprecio"
    try:
        detalle = f"Taller: {taller}\nFecha: {datetime.now().strftime('%Y-%m-%d')}\n\n{observaciones}"
        page = _notion().pages.create(
            parent={"database_id": os.environ["NOTION_DATABASE_ID"]},
            properties={
                "ID Siniestro":  {"title": [{"text": {"content": numero_factura[:100]}}]},
                "Total Auditado": {"number": total_facturado},
                "Estado":        {"select": {"name": dictamen}},
                "Detalle":       {"rich_text": [{"text": {"content": detalle[:2000]}}]},
            },
        )
        return json.dumps({
            "success": True,
            "notion_url": page.get("url", ""),
            "mensaje": "Dictamen registrado en Notion.",
        })
    except Exception as exc:
        print(f"[NOTION ERROR] {exc}")
        return json.dumps({"success": False, "error": str(exc)})


# ── Paso 1: Extracción visual con GPT-4o-mini ─────────────────────────────────

# Prompt compacto — misma información, ~40% menos tokens que la versión verbosa
_EXTRACT_PROMPT = (
    "OCR de factura automotriz. Devuelve SOLO este JSON válido, sin markdown:\n"
    '{"numero_factura":"str","taller":"str","fecha":"str","total":0,'
    '"items":[{"descripcion":"str","cantidad":0,"precio_unitario":0,"precio_total":0}]}\n'
    "Usa 'Sin número', 'No identificado' o 'No especificada' si falta algún campo."
)

async def _extract_invoice_data(contents: bytes, content_type: str) -> dict[str, Any]:
    client = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])
    b64 = base64.b64encode(contents).decode()
    response = await client.chat.completions.create(
        model=_model(),
        temperature=0,
        max_tokens=800,          # facturas raramente necesitan más
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{content_type};base64,{b64}",
                        "detail": "high",  # mantener "high" para capturar precios pequeños
                    },
                },
                {"type": "text", "text": _EXTRACT_PROMPT},
            ],
        }],
    )
    raw = response.choices[0].message.content.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1].removeprefix("json").strip()
    return json.loads(raw)


# ── Paso 2: Agente LangChain ───────────────────────────────────────────────────

_SYSTEM = """\
Eres auditor de facturas de siniestros. Sigue este proceso estrictamente:

1. VERIFICAR cada ítem usando 'consultar_tarifario'.
2. DETECTAR duplicados (misma descripción + precio).
3. DICTAMEN: "Aprobado" | "Alerta - Sobreprecio" | "Alerta - Ítem No Tarifado" | "Rechazado - Cobro Duplicado".
   (Cobro duplicado tiene precedencia.)
4. REGISTRAR con 'registrar_dictamen_notion'.
5. Responder SOLO con este JSON (sin texto adicional):
{{"dictamen":"str","items_auditados":[{{"descripcion":"str","precio":0,"estado":"OK|SOBREPRECIO|NO_TARIFADO|DUPLICADO","observacion":"str"}}],"total_facturado":0,"alertas":0,"notion_url":"str","resumen":"str"}}

REGLA CRÍTICA: Si 'consultar_tarifario' devuelve tipo_alerta="ERROR_SCHEMA" o tipo_alerta="ERROR_TOOL",
NO la vuelvas a llamar bajo ninguna circunstancia. Marca inmediatamente todos los ítems como NO_TARIFADO,
establece el dictamen como "Alerta - Ítem No Tarifado" y continúa con el paso 4."""


async def run_audit_agent(contents: bytes, content_type: str, filename: str) -> dict[str, Any]:
    """Punto de entrada principal: extrae datos y ejecuta el agente auditor."""

    # 1. Extracción visual
    try:
        invoice_data = await _extract_invoice_data(contents, content_type)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"GPT no devolvió JSON válido en la extracción: {exc}") from exc
    except Exception as exc:
        raise RuntimeError(f"Error extrayendo datos: {exc}") from exc

    # 2. Agente con tools
    llm = ChatOpenAI(
        model=_model(),
        temperature=0,
        max_tokens=1000,  # suficiente para el JSON de respuesta + razonamiento
        openai_api_key=os.environ["OPENAI_API_KEY"],
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", _SYSTEM),
        ("human", "{input}"),
        MessagesPlaceholder(variable_name="agent_scratchpad"),
    ])

    tools = [consultar_tarifario, registrar_dictamen_notion]
    agent = create_openai_tools_agent(llm, tools, prompt)
    executor = AgentExecutor(
        agent=agent,
        tools=tools,
        verbose=True,
        max_iterations=10,
        max_execution_time=90,          # corta el bucle si algo se atasca más de 90s
        early_stopping_method="generate", # en vez de detenerse en seco, genera respuesta final
        handle_parsing_errors=True,
    )

    # 3. Input compacto
    user_input = (
        f"Audita '{filename}':\n{json.dumps(invoice_data, ensure_ascii=False)}\n"
        "Verifica cada ítem, detecta duplicados, registra en Notion y devuelve el JSON."
    )

    raw = await asyncio.to_thread(executor.invoke, {"input": user_input})

    # 4. Parsear output
    output = raw.get("output", "")
    try:
        s, e = output.find("{"), output.rfind("}") + 1
        audit_result: dict = json.loads(output[s:e]) if s >= 0 else {}
    except (json.JSONDecodeError, ValueError):
        audit_result = {"resumen": output, "dictamen": "Error en formato de respuesta"}

    return {"success": True, "filename": filename, "invoice_data": invoice_data, "audit_result": audit_result}
