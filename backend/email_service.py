from __future__ import annotations

import base64
import os
from datetime import datetime
from io import BytesIO
from typing import Any


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


# ── Generación de PDF ──────────────────────────────────────────────────────────

def generate_audit_pdf(audit_data: dict) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import cm
    from reportlab.platypus import (
        HRFlowable, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle,
    )

    BLACK    = colors.black
    WHITE    = colors.white
    GREY_HDR = colors.Color(0.15, 0.15, 0.15)   # encabezados de tabla
    GREY_ALT = colors.Color(0.93, 0.93, 0.93)   # filas alternas
    GREY_BRD = colors.Color(0.60, 0.60, 0.60)   # bordes
    GREY_MID = colors.Color(0.45, 0.45, 0.45)   # texto secundario

    ESTADO_LABEL = {
        "OK":                    "Aprobado",
        "SOBREPRECIO":           "Sobreprecio",
        "NO_TARIFADO":           "No tarifado",
        "DUPLICADO":             "Duplicado",
        "INCOHERENCIA_MECANICA": "Incoherencia mecánica",
    }

    base = getSampleStyleSheet()

    def ps(name, **kw):
        defaults = {"fontName": "Helvetica", "fontSize": 10, "leading": 14,
                    "textColor": BLACK}
        defaults.update(kw)
        return ParagraphStyle(name, parent=base["Normal"], **defaults)

    s = {
        "title":   ps("title",  fontName="Helvetica-Bold", fontSize=16,
                       leading=20, spaceAfter=2),
        "sub":     ps("sub",    fontSize=9, textColor=GREY_MID),
        "h2":      ps("h2",     fontName="Helvetica-Bold", fontSize=11,
                       spaceBefore=14, spaceAfter=4, textColor=BLACK),
        "h3":      ps("h3",     fontName="Helvetica-Bold", fontSize=10,
                       spaceBefore=8, spaceAfter=2),
        "body":    ps("body",   fontSize=10, leading=14),
        "body_sm": ps("body_sm", fontSize=9, leading=12),
        "label":   ps("label",  fontName="Helvetica-Bold", fontSize=8,
                       textColor=GREY_MID),
        "small":   ps("small",  fontSize=8, leading=11, textColor=BLACK),
        "footer":  ps("footer", fontSize=8, textColor=GREY_MID, alignment=1),
        "center":  ps("center", fontSize=10, alignment=1),
        "center_b":ps("center_b", fontName="Helvetica-Bold", fontSize=11,
                       alignment=1),
    }

    def lbl(text: str) -> Paragraph:
        return Paragraph(text.upper(), s["label"])

    def val(text: str) -> Paragraph:
        return Paragraph(str(text), s["body"])

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        leftMargin=2.5*cm, rightMargin=2.5*cm,
        topMargin=2.5*cm, bottomMargin=2.5*cm,
    )

    invoice  = audit_data.get("invoice_data", {})
    result   = audit_data.get("audit_result", {})
    sinister = audit_data.get("sinister_report", "")
    items    = result.get("items_auditados", [])
    dictamen = result.get("dictamen", "—")
    total_f  = float(result.get("total_facturado", 0) or 0)
    total_a  = float(result.get("total_aprobado", 0) or 0)
    ahorro   = max(0.0, total_f - total_a)
    resumen  = result.get("resumen", "")
    notion   = result.get("notion_url", "")
    W        = 16 * cm
    fecha_hoy = datetime.now().strftime("%d/%m/%Y")
    hora_hoy  = datetime.now().strftime("%H:%M")

    elems: list = []

    # ── Membrete ─────────────────────────────────────────────────────────────────
    header_data = [[
        Paragraph("<b>COMPAÑÍA DE SEGUROS</b><br/>Departamento de Auditoría de Siniestros",
                  ps("hdr_left", fontName="Helvetica-Bold", fontSize=11, leading=15)),
        Paragraph(f"Fecha: {fecha_hoy}<br/>Hora:  {hora_hoy}",
                  ps("hdr_right", fontSize=9, leading=13, alignment=2)),
    ]]
    hdr_table = Table(header_data, colWidths=[W*0.65, W*0.35])
    hdr_table.setStyle(TableStyle([
        ("VALIGN",  (0,0), (-1,-1), "TOP"),
        ("TOPPADDING",    (0,0), (-1,-1), 0),
        ("BOTTOMPADDING", (0,0), (-1,-1), 0),
    ]))
    elems.append(hdr_table)
    elems.append(Spacer(1, 6))
    elems.append(HRFlowable(width=W, thickness=1.5, color=BLACK, spaceAfter=10))

    # Título del informe
    elems.append(Paragraph("INFORME DE AUDITORÍA DE FACTURACIÓN", s["title"]))
    elems.append(Spacer(1, 4))
    elems.append(HRFlowable(width=W, thickness=0.5, color=GREY_BRD, spaceAfter=12))

    # ── I. Datos de la factura ────────────────────────────────────────────────────
    elems.append(Paragraph("I.  DATOS DE LA FACTURA", s["h2"]))
    factura_rows = [
        [lbl("Taller"),          val(invoice.get("taller", "—")),
         lbl("N.° de Factura"),  val(invoice.get("numero_factura", "—"))],
        [lbl("Fecha"),           val(invoice.get("fecha", "—")),
         lbl("Total Facturado"), val(f"$ {float(invoice.get('total', 0) or 0):,.2f}")],
    ]
    ft = Table(factura_rows, colWidths=[3*cm, 5.5*cm, 3.5*cm, 4*cm])
    ft.setStyle(TableStyle([
        ("GRID",          (0,0), (-1,-1), 0.5, GREY_BRD),
        ("BACKGROUND",    (0,0), (-1,-1), WHITE),
        ("TOPPADDING",    (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING",   (0,0), (-1,-1), 6),
        ("RIGHTPADDING",  (0,0), (-1,-1), 6),
        ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
    ]))
    elems.append(ft)

    # ── II. Descripción del siniestro ─────────────────────────────────────────────
    if sinister:
        elems.append(Paragraph("II.  DESCRIPCIÓN DEL SINIESTRO", s["h2"]))
        elems.append(Paragraph(sinister.replace("\n", "<br/>"), s["body"]))

    # ── III. Dictamen ─────────────────────────────────────────────────────────────
    seccion = "III." if sinister else "II."
    elems.append(Paragraph(f"{seccion}  DICTAMEN FINAL", s["h2"]))
    elems.append(Spacer(1, 2))
    d_table = Table([[Paragraph(dictamen.upper(), s["center_b"])]], colWidths=[W])
    d_table.setStyle(TableStyle([
        ("BOX",           (0,0), (-1,-1), 1.5, BLACK),
        ("BACKGROUND",    (0,0), (-1,-1), WHITE),
        ("TOPPADDING",    (0,0), (-1,-1), 10),
        ("BOTTOMPADDING", (0,0), (-1,-1), 10),
    ]))
    elems.append(d_table)

    # ── IV. Resumen financiero ────────────────────────────────────────────────────
    seccion = "IV." if sinister else "III."
    elems.append(Paragraph(f"{seccion}  RESUMEN FINANCIERO", s["h2"]))
    fin_data = [
        [Paragraph("TOTAL FACTURADO", s["center"]),
         Paragraph("TOTAL APROBADO",  s["center"]),
         Paragraph("DIFERENCIA DETECTADA", s["center"])],
        [Paragraph(f"$ {total_f:,.2f}", s["center_b"]),
         Paragraph(f"$ {total_a:,.2f}", s["center_b"]),
         Paragraph(f"$ {ahorro:,.2f}",  s["center_b"])],
    ]
    fin_t = Table(fin_data, colWidths=[W/3]*3)
    fin_t.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,0),  GREY_HDR),
        ("TEXTCOLOR",     (0,0), (-1,0),  WHITE),
        ("BACKGROUND",    (0,1), (-1,1),  WHITE),
        ("TEXTCOLOR",     (0,1), (-1,1),  BLACK),
        ("GRID",          (0,0), (-1,-1), 0.5, GREY_BRD),
        ("FONTNAME",      (0,0), (-1,0),  "Helvetica-Bold"),
        ("FONTSIZE",      (0,0), (-1,-1), 9),
        ("TOPPADDING",    (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
        ("VALIGN",        (0,0), (-1,-1), "MIDDLE"),
    ]))
    elems.append(fin_t)

    if resumen:
        elems.append(Spacer(1, 8))
        elems.append(Paragraph(resumen, s["body"]))

    # ── V. Detalle de ítems auditados ─────────────────────────────────────────────
    if items:
        seccion = "V." if sinister else "IV."
        elems.append(Paragraph(f"{seccion}  DETALLE DE ÍTEMS AUDITADOS", s["h2"]))
        cws = [0.7*cm, 6.8*cm, 2.2*cm, 3.5*cm, 2.8*cm]
        thead = [[
            Paragraph("#",            s["center"]),
            Paragraph("Descripción",  s["center"]),
            Paragraph("Precio",       s["center"]),
            Paragraph("Estado",       s["center"]),
            Paragraph("Observación",  s["center"]),
        ]]
        trows = []
        for idx, item in enumerate(items):
            estado = item.get("estado", "")
            desc   = item.get("descripcion", "")
            obs    = item.get("observacion", "") or ""
            razon  = item.get("razonamiento_agente", "") or ""
            precio = item.get("precio", 0)
            p_str  = f"$ {float(precio):,.2f}" if isinstance(precio, (int, float)) else "—"
            nota   = razon[:100] if razon else obs[:100]

            desc_p  = Paragraph(desc, s["small"])
            nota_p  = Paragraph(nota, s["small"])
            est_lbl = ESTADO_LABEL.get(estado, estado.replace("_", " "))

            trows.append([
                Paragraph(str(idx + 1), ps("num", fontSize=8, alignment=1)),
                desc_p,
                Paragraph(p_str, ps("pr", fontSize=8, alignment=2)),
                Paragraph(est_lbl, ps("est", fontSize=8, alignment=1)),
                nota_p,
            ])

        all_rows = thead + trows
        item_t = Table(all_rows, colWidths=cws, repeatRows=1)
        style_cmds = [
            ("BACKGROUND",    (0,0),  (-1,0),  GREY_HDR),
            ("TEXTCOLOR",     (0,0),  (-1,0),  WHITE),
            ("FONTNAME",      (0,0),  (-1,0),  "Helvetica-Bold"),
            ("FONTSIZE",      (0,0),  (-1,-1), 8),
            ("GRID",          (0,0),  (-1,-1), 0.4, GREY_BRD),
            ("VALIGN",        (0,0),  (-1,-1), "TOP"),
            ("TOPPADDING",    (0,0),  (-1,-1), 4),
            ("BOTTOMPADDING", (0,0),  (-1,-1), 4),
            ("LEFTPADDING",   (0,0),  (-1,-1), 4),
            ("RIGHTPADDING",  (0,0),  (-1,-1), 4),
        ]
        for i in range(len(trows)):
            row = i + 1
            bg  = GREY_ALT if i % 2 == 0 else WHITE
            style_cmds.append(("BACKGROUND", (0, row), (-1, row), bg))
            style_cmds.append(("TEXTCOLOR",  (0, row), (-1, row), BLACK))
        item_t.setStyle(TableStyle(style_cmds))
        elems.append(item_t)

    # ── VI. Análisis de coherencia ────────────────────────────────────────────────
    incoherentes = [
        it for it in items
        if it.get("estado") == "INCOHERENCIA_MECANICA"
        or it.get("alerta_sugerida") == "INCOHERENCIA_MECANICA"
    ]
    duplicados = [
        it for it in items
        if it.get("estado") == "DUPLICADO"
        or it.get("alerta_sugerida") == "DUPLICADO"
    ]

    if incoherentes or duplicados:
        seccion_n = {"True_True": "VI.", "True_False": "VI.", "False_True": "V."}.get(
            f"{bool(sinister)}_True", "V.")
        elems.append(Paragraph(f"{seccion_n}  ANÁLISIS DE COHERENCIA CON EL SINIESTRO", s["h2"]))

        if sinister:
            elems.append(Paragraph(
                f"<b>Siniestro declarado:</b> {sinister}", s["body"]))
            elems.append(Spacer(1, 6))

        if incoherentes:
            elems.append(Paragraph("Ítems con incoherencia mecánica:", s["h3"]))
            for it in incoherentes:
                desc  = it.get("descripcion", "")
                razon = it.get("razonamiento_agente") or it.get("observacion") or "Sin detalle."
                elems.append(Paragraph(f"• <b>{desc}:</b> {razon}", s["body_sm"]))

        if duplicados:
            elems.append(Spacer(1, 6))
            elems.append(Paragraph("Ítems con cobro duplicado:", s["h3"]))
            for it in duplicados:
                desc  = it.get("descripcion", "")
                razon = it.get("razonamiento_agente") or it.get("observacion") or "Sin detalle."
                elems.append(Paragraph(f"• <b>{desc}:</b> {razon}", s["body_sm"]))

    # ── VII. Comunicación formal al taller ────────────────────────────────────────
    if dictamen != "Aprobado":
        elems.append(Spacer(1, 16))
        elems.append(HRFlowable(width=W, thickness=0.5, color=GREY_BRD, spaceAfter=10))
        elems.append(Paragraph("COMUNICACIÓN FORMAL AL TALLER", s["title"]))
        elems.append(Spacer(1, 4))
        elems.append(HRFlowable(width=W, thickness=0.5, color=GREY_BRD, spaceAfter=10))
        texto = _generate_informe(
            dictamen=dictamen,
            observaciones=resumen or "Ver detalle completo en el sistema de auditoría.",
            taller=invoice.get("taller", "Taller"),
            numero_factura=invoice.get("numero_factura", "N/A"),
        )
        for parrafo in texto.split("\n\n"):
            elems.append(Paragraph(parrafo.replace("\n", "<br/>"), s["body"]))
            elems.append(Spacer(1, 6))

    # ── Notion ────────────────────────────────────────────────────────────────────
    if notion:
        elems.append(Spacer(1, 8))
        elems.append(Paragraph(f"Registro en plataforma: {notion}", s["small"]))

    # ── Pie de página ─────────────────────────────────────────────────────────────
    elems.append(Spacer(1, 24))
    elems.append(HRFlowable(width=W, thickness=0.5, color=GREY_BRD, spaceAfter=6))
    elems.append(Paragraph(
        f"Documento generado por el Sistema de Auditoría de Facturación · {fecha_hoy} {hora_hoy}",
        s["footer"]))

    doc.build(elems)
    return buffer.getvalue()


# ── Envío por Mailjet ──────────────────────────────────────────────────────────

def send_report_email(to_email: str, audit_data: dict) -> dict[str, Any]:
    """Genera el PDF del informe y lo envía como adjunto por Mailjet."""
    from mailjet_rest import Client as MailjetClient

    api_key    = os.environ.get("MAILJET_API_KEY", "")
    secret_key = os.environ.get("MAILJET_SECRET_KEY", "")
    sender     = os.environ.get("MAILJET_SENDER_EMAIL", "")

    if not all([api_key, secret_key, sender]):
        return {"success": False, "error": "Credenciales de Mailjet no configuradas (MAILJET_API_KEY, MAILJET_SECRET_KEY, MAILJET_SENDER_EMAIL)."}

    invoice  = audit_data.get("invoice_data", {})
    result   = audit_data.get("audit_result", {})
    numero   = invoice.get("numero_factura", "N/A")
    dictamen = result.get("dictamen", "Dictamen")

    try:
        pdf_bytes = generate_audit_pdf(audit_data)
        pdf_b64   = base64.b64encode(pdf_bytes).decode()
    except Exception as exc:
        return {"success": False, "error": f"Error generando PDF: {exc}"}

    subject = f"Informe de Auditoría — Factura {numero} — {dictamen}"
    html_body = f"""
    <div style="font-family:'Courier New',monospace;max-width:600px;margin:0 auto;background:#0F172A;color:#F3F4F6">
      <div style="background:linear-gradient(to right, #3B82F6 0%, #06B6D4 100%);padding:24px;font-weight:600;font-size:18px;letter-spacing:1px;text-transform:uppercase;color:white">
        Informe de Auditoría de Facturación
      </div>
      <div style="border:1px solid #334155;padding:24px;background:#1E293B">
        <h2 style="margin-top:0;color:#3B82F6;font-size:16px;text-transform:uppercase">Resolución: {dictamen}</h2>
        <p style="color:#F3F4F6">Adjunto encontrará el informe completo de auditoría para la factura <strong>{numero}</strong>.</p>
        <p style="color:#F3F4F6">El informe incluye:</p>
        <ul style="color:#D1D5DB">
          <li>Datos de la factura y del taller</li>
          <li>Resumen financiero (facturado / aprobado / ahorro detectado)</li>
          <li>Detalle de cada ítem auditado con alertas</li>
          <li>Análisis de coherencia mecánica con el siniestro declarado</li>
          <li>Informe formal de rechazo al taller (si aplica)</li>
        </ul>
        <p style="color:#D1D5DB;font-size:12px;margin-top:20px">Generado el {datetime.now().strftime('%Y-%m-%d %H:%M')}</p>
      </div>
    </div>
    """

    mailjet = MailjetClient(auth=(api_key, secret_key), version="v3.1")
    safe_numero = "".join(c for c in numero if c.isalnum() or c in ("-", "_"))
    data = {
        "Messages": [{
            "From":    {"Email": sender, "Name": "Auditor de Siniestros"},
            "To":      [{"Email": to_email}],
            "Subject": subject,
            "HTMLPart": html_body,
            "TextPart": f"Resolución: {dictamen}\nAdjunto el informe PDF de auditoría para la factura {numero}.",
            "Attachments": [{
                "ContentType":   "application/pdf",
                "Filename":      f"informe_{safe_numero}.pdf",
                "Base64Content": pdf_b64,
            }],
        }]
    }

    try:
        resp = mailjet.send.create(data=data)
        if resp.status_code == 200:
            return {"success": True, "message": f"Informe enviado a {to_email}"}
        return {"success": False, "error": f"Mailjet respondió con status {resp.status_code}: {resp.json()}"}
    except Exception as exc:
        return {"success": False, "error": str(exc)}
