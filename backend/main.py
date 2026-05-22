import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv

load_dotenv() 

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from agent import run_audit_agent
from email_service import send_report_email

# ── Constantes ─────────────────────────────────────────────────────────────────
ALLOWED_TYPES = {"image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"}
MAX_BYTES = 10 * 1024 * 1024  # 10 MB

REQUIRED_ENV_VARS = [
    "OPENAI_API_KEY",
    "SUPABASE_URL",
    "SUPABASE_SERVICE_KEY",
    "NOTION_TOKEN",
    "NOTION_DATABASE_ID",
]


# ── Lifespan: validar env vars en arranque ─────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    missing = [v for v in REQUIRED_ENV_VARS if not os.environ.get(v)]
    if missing:
        raise RuntimeError(
            f"Variables de entorno faltantes: {', '.join(missing)}. "
            "Copia .env.example a .env y completa los valores."
        )
    yield


# ── App ────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Auditor Agéntico de Facturación de Siniestros",
    description="API que audita facturas de talleres contra el tarifario acordado usando GPT-4o + LangChain.",
    version="1.0.0",
    lifespan=lifespan,
)

_extra_origins = [o for o in [os.environ.get("FRONTEND_URL", "")] if o]

origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://iauditor.pages.dev",
] + _extra_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Rutas ──────────────────────────────────────────────────────────────────────

@app.get("/health", tags=["Status"])
async def health_check():
    return {"status": "ok", "service": "Auditor Agéntico de Facturación"}


@app.post("/api/audit", tags=["Auditoría"])
async def audit_invoice(
    file: UploadFile = File(..., description="Imagen (JPEG/PNG/WebP) o PDF de la factura"),
    sinister_report: str = Form(default="", description="Reporte de siniestralidad del ajustador"),
):

    # Validar tipo de contenido
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Tipo de archivo no soportado: '{file.content_type}'. "
                "Formatos permitidos: JPEG, PNG, WebP, PDF."
            ),
        )

    # Leer contenido
    try:
        contents = await file.read()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Error leyendo el archivo: {exc}") from exc

    if len(contents) == 0:
        raise HTTPException(status_code=400, detail="El archivo está vacío.")

    if len(contents) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="Archivo demasiado grande. Máximo permitido: 10 MB.")

    # Convertir PDF → imagen PNG (primera página)
    content_type = file.content_type
    if content_type == "application/pdf":
        try:
            import fitz  # PyMuPDF

            doc = fitz.open(stream=contents, filetype="pdf")
            if doc.page_count == 0:
                raise ValueError("El PDF no contiene páginas.")
            page = doc[0]
            pix = page.get_pixmap(dpi=200)
            contents = pix.tobytes("png")
            content_type = "image/png"
            doc.close()
        except ImportError as exc:
            raise HTTPException(
                status_code=422,
                detail="Soporte para PDF no disponible en este servidor. Sube la factura como imagen (JPEG/PNG/WebP).",
            ) from exc
        except Exception as exc:
            raise HTTPException(status_code=422, detail=f"No se pudo procesar el PDF: {exc}") from exc

    # Ejecutar agente
    try:
        result = await run_audit_agent(contents, content_type, file.filename or "factura", sinister_report)
        return JSONResponse(content=result)
    except RuntimeError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Error interno del servidor. Intenta de nuevo. Detalle: {exc}",
        ) from exc


@app.post("/api/send-report", tags=["Email"])
async def send_report(request: Request):
    try:
        body = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Body JSON inválido.")

    to_email   = (body.get("email") or "").strip()
    audit_data = body.get("audit_data")

    if not to_email:
        raise HTTPException(status_code=400, detail="Campo 'email' requerido.")
    if not audit_data:
        raise HTTPException(status_code=400, detail="Campo 'audit_data' requerido.")

    result = send_report_email(to_email, audit_data)
    if not result.get("success"):
        raise HTTPException(status_code=500, detail=result.get("error", "Error enviando correo."))
    return JSONResponse(content=result)
