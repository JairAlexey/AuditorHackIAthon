# Auditor Agéntico de Facturación de Siniestros

Sistema inteligente que audita facturas de talleres automotrices contra un tarifario acordado, detecta anomalías mediante IA y genera dictámenes automáticos.

---

## ¿Qué hace?

1. El ajustador sube la factura del taller (imagen o PDF) junto con el reporte de siniestralidad
2. GPT-4o Vision extrae los ítems y evalúa la coherencia mecánica de cada uno contra el reporte
3. Un agente LangChain consulta el tarifario en Supabase y detecta sobreprecios, ítems no tarifados, cobros duplicados e incongruencias mecánicas
4. El sistema registra el dictamen en Notion con nivel de riesgo, ahorro detectado y borrador de rechazo al taller
5. Opcionalmente envía el dictamen completo en PDF al correo del ajustador

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS (diseño neobrutalista) |
| Backend | FastAPI + LangChain + GPT-4o Vision |
| Base de datos | Supabase (tarifario de repuestos y mano de obra) |
| Backoffice | Notion API (registro de dictámenes con alertas y borradores) |
| Email / PDF | Mailjet + ReportLab |
| Infraestructura | Docker + Docker Compose |

---

## Estructura del proyecto

```
AuditorHackIAthon/
├── backend/
│   ├── main.py              # FastAPI — endpoints /api/audit y /api/send-report
│   ├── agent.py             # Agente LangChain: consulta tarifario y registra en Notion
│   ├── email_service.py     # Generación de PDF (ReportLab) y envío por Mailjet
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   └── App.jsx          # UI completa: dropzone, modal de correo, resultados
│   ├── public/
│   │   └── _redirects       # SPA fallback para despliegue en producción
│   ├── .env.example         # Variables de entorno del frontend
│   └── vite.config.js
├── docker-compose.yml
├── .env.example             # Variables de entorno del backend
└── GIT_WORKFLOW.md          # Guía de ramas y mergeo del equipo
```

---

## Cómo correr el proyecto

### Requisitos

- Docker y Docker Compose instalados
- Cuenta en OpenAI, Supabase, Notion y Mailjet
- Tabla `tarifario` creada en Supabase (ver `backend/supabase_setup.sql`)
- Base de datos Notion con las propiedades requeridas

### Variables de entorno

Copia `.env.example` a `.env` en la raíz y completa los valores:

```bash
cp .env.example .env
```

```env
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4o-mini

SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...

NOTION_TOKEN=secret_...
NOTION_DATABASE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

MAILJET_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
MAILJET_SECRET_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
MAILJET_SENDER_EMAIL=tumail@ejemplo.com

FRONTEND_URL=http://localhost:5173
```

### Levantar el proyecto

```bash
# Primera vez o cuando cambies requirements.txt
docker compose up --build

# Siguientes veces
docker compose up
```

- Frontend: http://localhost:5173
- Backend (API): http://localhost:8000
- Docs de la API: http://localhost:8000/docs

---

## Notion — configuración de la base de datos

La base de datos de Notion requiere estas propiedades:

| Propiedad | Tipo |
|---|---|
| ID Siniestro | Title |
| Total Auditado | Number |
| Ahorro Generado | Number |
| Estado | Select |
| Nivel de Riesgo | Select (`Bajo` / `Medio` / `Alto`) |
| Detalle | Rich Text |

---

## Tipos de dictamen

| Dictamen | Condición |
|---|---|
| Aprobado | Todos los ítems dentro del tarifario y coherentes con el siniestro |
| Alerta - Sobreprecio | Al menos un ítem supera el precio máximo del tarifario |
| Alerta - Ítem No Tarifado | Al menos un ítem no figura en el tarifario |
| Rechazado - Cobro Duplicado | Ítems repetidos en la factura |
| Rechazado - Incoherencia Mecánica | Ítems incompatibles con el tipo de daño reportado |
