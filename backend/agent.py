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
    total_aprobado: float = Field(
        description="Suma de precios aprobados: precio_maximo para ítems OK/SOBREPRECIO, "
                    "0 para INCOHERENCIA_MECANICA/DUPLICADO/NO_TARIFADO"
    )
    dictamen: str = Field(
        description="Uno de: 'Aprobado', 'Alerta - Sobreprecio', "
                    "'Alerta - Ítem No Tarifado', 'Rechazado - Cobro Duplicado', "
                    "'Rechazado - Incoherencia Mecánica'"
    )
    observaciones: str = Field(
        description="Detalle completo: sobreprecios con montos, "
                    "ítems incoherentes con el siniestro, duplicados detectados"
    )
    nivel_riesgo: str = Field(
        description="'Bajo' si 0-1 alertas, 'Medio' si 2-3 alertas, 'Alto' si 4+ alertas"
    )


# ── Tool 1: Supabase ───────────────────────────────────────────────────────────

@tool("consultar_tarifario", args_schema=ConsultarTarifarioInput)
def consultar_tarifario(descripcion: str, precio_cobrado: float) -> str:
    """Verifica en Supabase si el precio cobrado de un ítem supera el máximo del tarifario."""
    try:
        result = (
            _supabase()
            .table("tarifario")
            .select("descripcion, precio_maximo, unidad")
            .ilike("descripcion", f"%{descripcion[:200]}%")
            .limit(1)
            .execute()
        )
        if not result.data:
            return json.dumps({
                "encontrado": False, "alerta": True,
                "tipo_alerta": "ITEM_NO_TARIFADO",
                "precio_maximo": 0,
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
                if over else f"OK: ${precio_cobrado:.2f} <= max ${precio_max:.2f}"
            ),
        })
    except Exception as exc:
        err = str(exc)
        if "42703" in err or "does not exist" in err:
            return json.dumps({
                "encontrado": False,
                "alerta": True,
                "tipo_alerta": "ERROR_SCHEMA",
                "precio_maximo": 0,
                "mensaje": (
                    "ERROR_SCHEMA: La tabla 'tarifario' no tiene el esquema esperado. "
                    "NO vuelvas a llamar a esta herramienta. "
                    "Marca todos los ítems pendientes como NO_TARIFADO y continúa."
                ),
            })
        return json.dumps({"error": err, "alerta": True, "tipo_alerta": "ERROR_TOOL", "precio_maximo": 0})


# ── Tool 2: Notion ─────────────────────────────────────────────────────────────

_VALID_DICTAMENES = {
    "Aprobado",
    "Alerta - Sobreprecio",
    "Alerta - Ítem No Tarifado",
    "Rechazado - Cobro Duplicado",
    "Rechazado - Incoherencia Mecánica",
}

_VALID_RIESGOS = {"Bajo", "Medio", "Alto"}


def _generate_informe(dictamen: str, observaciones: str, taller: str, numero_factura: str) -> str:
    fecha = datetime.now().strftime("%d/%m/%Y")
    return (
        f"INFORME DE AUDITORIA DE SINIESTRO\n"
        f"Fecha: {fecha}  |  Factura N {numero_factura}  |  Taller: {taller}\n\n"
        f"Estimado representante de {taller}:\n\n"
        f"Por medio del presente documento, el Departamento de Auditoria de Siniestros "
        f"comunica formalmente el resultado tecnico de la revision practicada sobre la "
        f"factura N {numero_factura}, con fecha de evaluacion {fecha}.\n\n"
        f"RESOLUCION: {dictamen}\n\n"
        f"FUNDAMENTOS TECNICOS:\n"
        f"{observaciones}\n\n"
        f"REQUERIMIENTOS AL TALLER:\n"
        f"Dentro de un plazo maximo de cinco (5) dias habiles contados desde la recepcion "
        f"del presente informe, el taller debera presentar alguna de las siguientes "
        f"alternativas segun corresponda:\n"
        f"  a) Nota de credito por los conceptos observados.\n"
        f"  b) Documentacion tecnica que respalde los montos y repuestos facturados.\n"
        f"  c) Registro fotografico del siniestro que acredite los danos reclamados.\n\n"
        f"El incumplimiento de los plazos establecidos podra derivar en la revision "
        f"del acuerdo de prestacion de servicios con la compania aseguradora.\n\n"
        f"Atentamente,\n"
        f"Departamento de Auditoria de Siniestros\n"
        f"Compania de Seguros"
    )


def _text_blocks(text: str, limit: int = 1900) -> list:
    """Divide un texto largo en múltiples bloques de párrafo para Notion."""
    blocks = []
    for i in range(0, len(text), limit):
        blocks.append({
            "object": "block",
            "type": "paragraph",
            "paragraph": {
                "rich_text": [{"type": "text", "text": {"content": text[i:i + limit]}}]
            },
        })
    return blocks or [{"object": "block", "type": "paragraph", "paragraph": {"rich_text": []}}]


@tool("registrar_dictamen_notion", args_schema=RegistrarDictamenInput)
def registrar_dictamen_notion(
    numero_factura: str,
    taller: str,
    total_facturado: float,
    total_aprobado: float,
    dictamen: str,
    observaciones: str,
    nivel_riesgo: str,
) -> str:
    """Inserta el dictamen de auditoría enriquecido en Notion con ahorro generado, nivel de riesgo e informe de rechazo."""
    if dictamen not in _VALID_DICTAMENES:
        dictamen = "Alerta - Sobreprecio"
    if nivel_riesgo not in _VALID_RIESGOS:
        nivel_riesgo = "Medio"

    ahorro = round(total_facturado - total_aprobado, 2)
    informe = _generate_informe(dictamen, observaciones, taller, numero_factura)
    detalle = (
        f"Taller: {taller} | Fecha: {datetime.now().strftime('%Y-%m-%d')}\n"
        f"Total facturado: ${total_facturado:.2f} | Aprobado: ${total_aprobado:.2f} | "
        f"Ahorro detectado: ${ahorro:.2f}\n\n{observaciones}"
    )

    # ── Callouts de alerta por tipo de dictamen (sin emojis en el texto) ─────────
    _ALERT_MAP = {
        "Rechazado - Incoherencia Mecánica": (
            "ALERTA: INCONGRUENCIA MECANICA DETECTADA — "
            "Los ítems facturados no corresponden al tipo de daño reportado en el siniestro. "
            "Revisar cada ítem marcado y solicitar evidencia fotográfica al taller.",
            "red_background",
            "!",
        ),
        "Rechazado - Cobro Duplicado": (
            "ALERTA: COBRO DUPLICADO DETECTADO — "
            "Se identificaron ítems repetidos en la factura. Posible cobro indebido.",
            "red_background",
            "x",
        ),
        "Alerta - Sobreprecio": (
            "ALERTA: SOBREPRECIO DETECTADO — "
            "El precio facturado supera el máximo establecido en el tarifario acordado.",
            "yellow_background",
            "$",
        ),
        "Alerta - Ítem No Tarifado": (
            "ALERTA: ITEM NO TARIFADO — "
            "Se encontraron conceptos que no figuran en el tarifario. Requieren validación manual.",
            "orange_background",
            "?",
        ),
    }

    page_children: list = []

    # Bloque de alerta
    if dictamen in _ALERT_MAP:
        alert_text, alert_color, alert_icon = _ALERT_MAP[dictamen]
        page_children.append({
            "object": "block",
            "type": "callout",
            "callout": {
                "rich_text": [{"type": "text", "text": {"content": alert_text}}],
                "icon": {"type": "emoji", "emoji": "⚠️"},
                "color": alert_color,
            },
        })
        page_children.append({"object": "block", "type": "divider", "divider": {}})

    # Sección de observaciones/alertas detectadas
    page_children += [
        {
            "object": "block",
            "type": "heading_2",
            "heading_2": {
                "rich_text": [{"type": "text", "text": {"content": "Detalle de Alertas Detectadas"}}],
                "color": "default",
            },
        },
        *_text_blocks(observaciones),
        {"object": "block", "type": "divider", "divider": {}},
    ]

    # Sección de informe formal
    page_children += [
        {
            "object": "block",
            "type": "heading_2",
            "heading_2": {
                "rich_text": [{"type": "text", "text": {"content": "Informe de Rechazo al Taller"}}],
                "color": "default",
            },
        },
        *_text_blocks(informe),
    ]

    try:
        page = _notion().pages.create(
            parent={"database_id": os.environ["NOTION_DATABASE_ID"]},
            properties={
                "ID Siniestro":    {"title": [{"text": {"content": numero_factura[:100]}}]},
                "Total Auditado":  {"number": total_facturado},
                "Ahorro Generado": {"number": ahorro},
                "Estado":          {"select": {"name": dictamen}},
                "Nivel de Riesgo": {"select": {"name": nivel_riesgo}},
                "Detalle":         {"rich_text": [{"text": {"content": detalle[:2000]}}]},
            },
            children=page_children,
        )
        return json.dumps({
            "success": True,
            "notion_url": page.get("url", ""),
            "ahorro_generado": ahorro,
            "nivel_riesgo": nivel_riesgo,
            "mensaje": f"Dictamen registrado. Ahorro detectado: ${ahorro:.2f}. Riesgo: {nivel_riesgo}.",
        })
    except Exception as exc:
        print(f"[NOTION ERROR] {exc}")
        return json.dumps({"success": False, "error": str(exc)})


# ── Paso 1: Extracción visual con GPT-4o ──────────────────────────────────────

def _make_extract_prompt(sinister_report: str) -> str:
    report_ctx = ""
    if sinister_report.strip():
        report_ctx = (
            f'\nReporte de siniestralidad del ajustador: "{sinister_report}"\n\n'
            "REGLAS CRÍTICAS DE COHERENCIA MECÁNICA (APLICAR ESTRICTAMENTE):\n"
            "\n1. ZONA AFECTADA:\n"
            "   Extrae de qué zona es el daño. Ej: 'puerta derecha' → solo afecta esa zona.\n"
            "\n2. COMPONENTES POR ZONA:\n"
            "   Derecha:    puerta, vidrio, espejo, moldura, guardabarros, salpicadera\n"
            "   Izquierda:  puerta, vidrio, espejo, moldura, guardabarros, salpicadera\n"
            "   Frontal:    bumper delantero, faro, radiador, capó\n"
            "   Trasero:    bumper trasero, luz, maletero\n"
            "   Techo:      techo, molduras\n"
            "\n3. MARCAR INCOHERENCIA_MECANICA INMEDIATAMENTE SI:\n"
            "   a) ZONA INCORRECTA:\n"
            "      'Bumper Frontal' cuando daño es 'puerta derecha' → INCOHERENCIA\n"
            "      'Bumper Trasero' cuando daño es 'puerta derecha' → INCOHERENCIA\n"
            "   b) MANTENIMIENTO DE RUTINA (jamás por accidente):\n"
            "      'Cambio de aceite', 'Filtro de aceite', 'Lubricación' → INCOHERENCIA\n"
            "      'Alineación', 'Rotación de llantas', 'Diagnóstico' → INCOHERENCIA\n"
            "      'Lavado', 'Pulido', 'Detallado' → INCOHERENCIA\n"
            "   c) SIN RELACIÓN CON ACCIDENTE → INCOHERENCIA\n"
            "\n4. DUPLICADOS: mismo código/descripción 2+ veces → DUPLICADO\n"
            "\n5. CRITERIO DE DUDA: si NO sabes si corresponde → INCOHERENCIA_MECANICA\n"
            "   Es más seguro rechazar que aprobar.\n"
        )

    return (
        f"OCR de factura automotriz.{report_ctx}"
        "DEVUELVE ESTRICTAMENTE:\n"
        '{"numero_factura":"str","taller":"str","fecha":"str","total":0,'
        '"items":[{"codigo":"str","descripcion":"str","cantidad":0,"precio_unitario":0,'
        '"coherencia_mecanica":true,"razonamiento_agente":"str","alerta_sugerida":"OK"}]}\n'
        "\nOPCIONES para alerta_sugerida: 'OK' | 'INCOHERENCIA_MECANICA' | 'DUPLICADO'\n"
        "RECUERDA:\n"
        "- Cambio de aceite → INCOHERENCIA_MECANICA\n"
        "- Bumper frontal cuando daño es lateral → INCOHERENCIA_MECANICA\n"
        "- Si hay duda → INCOHERENCIA_MECANICA (no OK)\n"
        "Usa 'Sin número', 'No identificado' o 'No especificada' si falta algún campo."
    )


async def _extract_invoice_data(
    contents: bytes, content_type: str, sinister_report: str = ""
) -> dict[str, Any]:
    client = AsyncOpenAI(api_key=os.environ["OPENAI_API_KEY"])
    b64 = base64.b64encode(contents).decode()
    prompt = _make_extract_prompt(sinister_report)
    response = await client.chat.completions.create(
        model=_model(),
        temperature=0,
        max_tokens=1200,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:{content_type};base64,{b64}",
                        "detail": "high",
                    },
                },
                {"type": "text", "text": prompt},
            ],
        }],
    )
    raw = response.choices[0].message.content.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1].removeprefix("json").strip()
    return json.loads(raw)


# ── Paso 2: Agente LangChain ───────────────────────────────────────────────────

_SYSTEM = """\
Eres perito auditor de facturas de siniestros. Los ítems extraídos incluyen evaluación previa de coherencia mecánica (campo alerta_sugerida).

Proceso estricto:
1. VERIFICAR el precio de cada ítem con 'consultar_tarifario'.
2. COMBINAR alertas — el estado final de cada ítem es el más grave de:
   - Alerta de precio: SOBREPRECIO o NO_TARIFADO (resultado de consultar_tarifario)
   - Alerta mecánica del ítem: alerta_sugerida='INCOHERENCIA_MECANICA'
   - Alerta de duplicado: alerta_sugerida='DUPLICADO'
   Precedencia: DUPLICADO > INCOHERENCIA_MECANICA > SOBREPRECIO > NO_TARIFADO > OK
3. CALCULAR total_aprobado = suma de precio_maximo (del tarifario) para ítems OK/SOBREPRECIO + 0 para el resto.
4. CONTAR alertas = número de ítems con estado ≠ OK.
5. NIVEL_RIESGO: "Bajo" si alertas≤1 | "Medio" si alertas 2-3 | "Alto" si alertas≥4.
6. DICTAMEN (aplica el más grave encontrado):
   "Rechazado - Cobro Duplicado" | "Rechazado - Incoherencia Mecánica" | "Alerta - Sobreprecio" | "Alerta - Ítem No Tarifado" | "Aprobado"
7. REGISTRAR con 'registrar_dictamen_notion' incluyendo total_aprobado, nivel_riesgo y observaciones detalladas.
8. Responder SOLO con este JSON (sin texto adicional):
{{"dictamen":"str","items_auditados":[{{"descripcion":"str","precio":0,"estado":"OK|SOBREPRECIO|NO_TARIFADO|DUPLICADO|INCOHERENCIA_MECANICA","observacion":"str","razonamiento_agente":"str","alerta_sugerida":"OK|INCOHERENCIA_MECANICA|DUPLICADO"}}],"total_facturado":0,"total_aprobado":0,"alertas":0,"notion_url":"str","resumen":"str"}}

REGLA CRÍTICA: Si 'consultar_tarifario' devuelve ERROR_SCHEMA o ERROR_TOOL, NO la vuelvas a llamar bajo ninguna circunstancia. Marca todos los ítems como NO_TARIFADO y continúa con el paso 7."""


async def run_audit_agent(
    contents: bytes,
    content_type: str,
    filename: str,
    sinister_report: str = "",
) -> dict[str, Any]:
    """Punto de entrada principal: extrae datos y ejecuta el agente auditor."""

    # 1. Extracción visual con análisis de coherencia mecánica
    try:
        invoice_data = await _extract_invoice_data(contents, content_type, sinister_report)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"GPT no devolvió JSON válido en la extracción: {exc}") from exc
    except Exception as exc:
        raise RuntimeError(f"Error extrayendo datos: {exc}") from exc

    # 2. Agente con tools
    llm = ChatOpenAI(
        model=_model(),
        temperature=0,
        max_tokens=1500,
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
        max_iterations=12,
        max_execution_time=90,
        early_stopping_method="generate",
        handle_parsing_errors=True,
    )

    user_input = (
        f"Audita '{filename}':\n{json.dumps(invoice_data, ensure_ascii=False)}\n"
        "Verifica precios en tarifario, combina con alertas mecánicas ya detectadas, "
        "registra en Notion y devuelve el JSON final."
    )

    raw = await asyncio.to_thread(executor.invoke, {"input": user_input})

    # 3. Parsear output
    output = raw.get("output", "")
    try:
        s, e = output.find("{"), output.rfind("}") + 1
        audit_result: dict = json.loads(output[s:e]) if s >= 0 else {}
    except (json.JSONDecodeError, ValueError):
        audit_result = {"resumen": output, "dictamen": "Error en formato de respuesta"}

    return {
        "success": True,
        "filename": filename,
        "invoice_data": invoice_data,
        "audit_result": audit_result,
        "sinister_report": sinister_report,
    }
