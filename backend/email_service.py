from __future__ import annotations

import base64
import os
from datetime import datetime
from io import BytesIO
from typing import Any


# ── Borrador (duplicado de agent.py para evitar import circular) ───────────────

def _borrador(dictamen: str, observaciones: str, taller: str, numero_factura: str) -> str:
    fecha = datetime.now().strftime("%Y-%m-%d")
    return (
        f"Estimado representante de {taller},\n\n"
        f"El Departamento de Auditoría informa la observación de la factura "
        f"N° {numero_factura}, evaluada el {fecha}.\n\n"
        f"DICTAMEN: {dictamen}\n\n"
        f"MOTIVOS:\n{observaciones}\n\n"
        "Se solicita la corrección de los conceptos observados o documentación "
        "adicional dentro de los 5 días hábiles siguientes.\n\n"
        "Atentamente,\nDepartamento de Auditoría de Siniestros"
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

    # ── Paleta ────────────────────────────────────────────────────────────────
    C = {
        "black":  colors.black,
        "white":  colors.white,
        "grey":   colors.Color(0.5, 0.5, 0.5),
        "lgrey":  colors.Color(0.93, 0.93, 0.93),
        "green":  colors.Color(0.42, 0.79, 0.47),
        "red":    colors.Color(1.0,  0.42, 0.42),
        "orange": colors.Color(1.0,  0.62, 0.11),
        "yellow": colors.Color(0.96, 0.90, 0.26),
    }

    ESTADO_BG = {
        "OK":                    C["green"],
        "SOBREPRECIO":           C["red"],
        "NO_TARIFADO":           C["orange"],
        "DUPLICADO":             C["yellow"],
        "INCOHERENCIA_MECANICA": C["orange"],
    }

    DICTAMEN_BG = {
        "Aprobado":                          C["green"],
        "Alerta - Sobreprecio":              C["yellow"],
        "Alerta - Ítem No Tarifado":         C["orange"],
        "Rechazado - Cobro Duplicado":       C["red"],
        "Rechazado - Incoherencia Mecánica": C["red"],
    }

    # ── Estilos ────────────────────────────────────────────────────────────────
    base = getSampleStyleSheet()
    def ps(name, **kw):
        defaults = {"fontName": "Helvetica", "fontSize": 9, "leading": 13}
        defaults.update(kw)
        return ParagraphStyle(name, parent=base["Normal"], **defaults)
    s = {
        "title":  ps("title",  fontName="Helvetica-Bold", fontSize=20, spaceAfter=2, leading=24),
        "sub":    ps("sub",    fontSize=8,  textColor=C["grey"]),
        "h2":     ps("h2",     fontName="Helvetica-Bold", fontSize=11, spaceBefore=10, spaceAfter=3),
        "label":  ps("label",  fontName="Helvetica-Bold", fontSize=7,  textColor=C["grey"]),
        "body":   ps("body"),
        "small":  ps("small",  fontSize=7,  textColor=C["grey"]),
        "footer": ps("footer", fontSize=7,  textColor=C["grey"], alignment=1),
    }

    def lbl(text: str) -> Paragraph:
        return Paragraph(text, s["label"])

    def info_table(rows: list, col_widths: list) -> Table:
        t = Table(rows, colWidths=col_widths)
        t.setStyle(TableStyle([
            ("FONTNAME",      (0,0), (-1,-1), "Helvetica"),
            ("FONTSIZE",      (0,0), (-1,-1), 9),
            ("GRID",          (0,0), (-1,-1), 0.5, colors.Color(0.8, 0.8, 0.8)),
            ("BACKGROUND",    (0,0), (-1,-1), C["lgrey"]),
            ("TOPPADDING",    (0,0), (-1,-1), 5),
            ("BOTTOMPADDING", (0,0), (-1,-1), 5),
            ("LEFTPADDING",   (0,0), (-1,-1), 6),
        ]))
        return t

    buffer   = BytesIO()
    doc      = SimpleDocTemplate(buffer, pagesize=A4,
                                 leftMargin=2*cm, rightMargin=2*cm,
                                 topMargin=2*cm,  bottomMargin=2*cm)
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
    W        = 17 * cm

    elems: list = []

    # ── Encabezado ──────────────────────────────────────────────────────────────
    elems.append(Paragraph("AUDITOR AGÉNTICO DE FACTURACIÓN", s["title"]))
    elems.append(Paragraph(
        f"Dictamen de Auditoría — generado el {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        s["sub"]))
    elems.append(HRFlowable(width=W, thickness=3, color=C["black"], spaceAfter=8))

    # ── Datos factura ────────────────────────────────────────────────────────────
    elems.append(Paragraph("DATOS DE LA FACTURA", s["h2"]))
    rows = [
        [lbl("Taller"),  invoice.get("taller", "—"),         lbl("N° Factura"), invoice.get("numero_factura", "—")],
        [lbl("Fecha"),   invoice.get("fecha", "—"),           lbl("Total"),      f"${float(invoice.get('total', 0) or 0):.2f}"],
    ]
    elems.append(info_table(rows, col_widths=[2.8*cm, 5.7*cm, 3*cm, 5.5*cm]))

    # ── Reporte de siniestralidad ────────────────────────────────────────────────
    if sinister:
        elems.append(Paragraph("REPORTE DE SINIESTRALIDAD", s["h2"]))
        elems.append(Paragraph(sinister.replace("\n", "<br/>"), s["body"]))

    # ── Dictamen banner ─────────────────────────────────────────────────────────
    elems.append(Spacer(1, 8))
    elems.append(Paragraph("DICTAMEN FINAL", s["h2"]))
    d_color = DICTAMEN_BG.get(dictamen, C["grey"])
    d_text_color = C["black"] if d_color == C["yellow"] else C["white"]
    d_table = Table([[dictamen.upper()]], colWidths=[W])
    d_table.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), d_color),
        ("TEXTCOLOR",     (0,0), (-1,-1), d_text_color),
        ("FONTNAME",      (0,0), (-1,-1), "Helvetica-Bold"),
        ("FONTSIZE",      (0,0), (-1,-1), 13),
        ("ALIGN",         (0,0), (-1,-1), "CENTER"),
        ("TOPPADDING",    (0,0), (-1,-1), 9),
        ("BOTTOMPADDING", (0,0), (-1,-1), 9),
    ]))
    elems.append(d_table)

    # ── Resumen financiero ───────────────────────────────────────────────────────
    elems.append(Spacer(1, 5))
    a_bg = C["green"] if ahorro > 0 else C["lgrey"]
    a_fg = C["white"] if ahorro > 0 else C["black"]
    fin_data = [
        [lbl("FACTURADO"),  lbl("APROBADO"),  lbl("AHORRO DETECTADO")],
        [f"${total_f:.2f}", f"${total_a:.2f}", f"${ahorro:.2f}"],
    ]
    fin_table = Table(fin_data, colWidths=[W/3]*3)
    fin_table.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,0),  C["black"]),
        ("TEXTCOLOR",     (0,0), (-1,0),  C["white"]),
        ("BACKGROUND",    (2,1), (2,1),   a_bg),
        ("TEXTCOLOR",     (2,1), (2,1),   a_fg),
        ("FONTNAME",      (0,0), (-1,-1), "Helvetica-Bold"),
        ("FONTSIZE",      (0,1), (-1,-1), 14),
        ("FONTSIZE",      (0,0), (-1,0),  7),
        ("ALIGN",         (0,0), (-1,-1), "CENTER"),
        ("GRID",          (0,0), (-1,-1), 1.5, C["black"]),
        ("TOPPADDING",    (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
    ]))
    elems.append(fin_table)

    # ── Resumen agente ───────────────────────────────────────────────────────────
    if resumen:
        elems.append(Spacer(1, 6))
        elems.append(Paragraph(resumen, s["body"]))

    # ── Ítems auditados ──────────────────────────────────────────────────────────
    if items:
        elems.append(Paragraph(f"ÍTEMS AUDITADOS ({len(items)})", s["h2"]))
        cws = [0.8*cm, 7.5*cm, 2.5*cm, 3.8*cm, 2.4*cm]
        thead = [["#", "Descripción / Observación", "Precio", "Estado", "Alerta"]]
        trows = []
        estado_bgs: list[Any] = []
        for idx, item in enumerate(items):
            estado  = item.get("estado", "")
            desc    = item.get("descripcion", "")
            obs     = item.get("observacion", "")
            razon   = item.get("razonamiento_agente", "")
            precio  = item.get("precio", 0)
            p_str   = f"${float(precio):.2f}" if isinstance(precio, (int, float)) else "—"

            if obs:
                desc_p = Paragraph(f"<b>{desc}</b><br/><font size='7' color='grey'>{obs}</font>", s["body"])
            else:
                desc_p = Paragraph(f"<b>{desc}</b>", s["body"])

            razon_p = Paragraph((razon or "")[:90], s["small"])
            trows.append([str(idx+1), desc_p, p_str, estado.replace("_", " "), razon_p])
            estado_bgs.append(ESTADO_BG.get(estado, C["lgrey"]))

        all_rows = thead + trows
        item_table = Table(all_rows, colWidths=cws, repeatRows=1)
        style_cmds = [
            ("BACKGROUND",    (0,0),  (-1,0),  C["black"]),
            ("TEXTCOLOR",     (0,0),  (-1,0),  C["white"]),
            ("FONTNAME",      (0,0),  (-1,0),  "Helvetica-Bold"),
            ("FONTSIZE",      (0,0),  (-1,-1), 8),
            ("ALIGN",         (0,0),  (0,-1),  "CENTER"),
            ("ALIGN",         (2,0),  (3,-1),  "CENTER"),
            ("GRID",          (0,0),  (-1,-1), 0.5, C["black"]),
            ("VALIGN",        (0,0),  (-1,-1), "TOP"),
            ("TOPPADDING",    (0,0),  (-1,-1), 4),
            ("BOTTOMPADDING", (0,0),  (-1,-1), 4),
        ]
        for i, bg in enumerate(estado_bgs):
            row = i + 1
            bg_is_alert = bg not in (C["green"], C["lgrey"])
            if bg_is_alert:
                style_cmds.append(("BACKGROUND", (3, row), (3, row), bg))
                style_cmds.append(("TEXTCOLOR",  (3, row), (3, row),
                                   C["black"] if bg == C["yellow"] else C["white"]))
            bg_row = C["lgrey"] if row % 2 == 0 else C["white"]
            style_cmds.append(("BACKGROUND", (0, row), (2, row), bg_row))
            style_cmds.append(("BACKGROUND", (4, row), (4, row), bg_row))
        item_table.setStyle(TableStyle(style_cmds))
        elems.append(item_table)

    # ── Borrador de rechazo ──────────────────────────────────────────────────────
    if dictamen != "Aprobado":
        elems.append(Spacer(1, 14))
        elems.append(HRFlowable(width=W, thickness=2, color=C["black"], spaceAfter=6))
        elems.append(Paragraph("BORRADOR DE RECHAZO AL TALLER", s["h2"]))
        texto = _borrador(
            dictamen=dictamen,
            observaciones=resumen or "Ver detalle completo en el sistema de auditoría.",
            taller=invoice.get("taller", "Taller"),
            numero_factura=invoice.get("numero_factura", "N/A"),
        )
        elems.append(Paragraph(texto.replace("\n", "<br/>"), s["body"]))

    # ── Notion link ──────────────────────────────────────────────────────────────
    if notion:
        elems.append(Spacer(1, 8))
        elems.append(Paragraph(f"Panel de control Notion: {notion}", s["small"]))

    # ── Footer ───────────────────────────────────────────────────────────────────
    elems.append(Spacer(1, 20))
    elems.append(HRFlowable(width=W, thickness=1, color=C["grey"], spaceAfter=4))
    elems.append(Paragraph(
        f"Generado por Auditor Agéntico de Facturación · {datetime.now().strftime('%Y-%m-%d %H:%M')} · Sistema Hackathon",
        s["footer"]))

    doc.build(elems)
    return buffer.getvalue()


# ── Envío por Mailjet ──────────────────────────────────────────────────────────

def send_report_email(to_email: str, audit_data: dict) -> dict[str, Any]:
    """Genera el PDF del dictamen y lo envía como adjunto por Mailjet."""
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

    subject = f"Dictamen de Auditoría — Factura {numero} — {dictamen}"
    html_body = f"""
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#000;color:#F5E642;padding:20px;font-weight:900;font-size:20px;letter-spacing:2px;text-transform:uppercase">
        Auditor Agéntico de Facturación
      </div>
      <div style="border:3px solid #000;padding:20px">
        <h2 style="margin-top:0">Dictamen: {dictamen}</h2>
        <p>Adjunto encontrará el reporte completo de auditoría para la factura <strong>{numero}</strong>.</p>
        <p>El PDF incluye:</p>
        <ul>
          <li>Datos de la factura y del taller</li>
          <li>Resumen financiero (facturado / aprobado / ahorro)</li>
          <li>Detalle de cada ítem auditado con alertas</li>
          <li>Borrador de rechazo al taller (si aplica)</li>
        </ul>
        <p style="color:#888;font-size:12px">Generado el {datetime.now().strftime('%Y-%m-%d %H:%M')}</p>
      </div>
    </div>
    """

    mailjet = MailjetClient(auth=(api_key, secret_key), version="v3.1")
    data = {
        "Messages": [{
            "From":    {"Email": sender, "Name": "Auditor de Siniestros"},
            "To":      [{"Email": to_email}],
            "Subject": subject,
            "HTMLPart": html_body,
            "TextPart": f"Dictamen: {dictamen}\nAdjunto el reporte PDF de auditoría para la factura {numero}.",
            "Attachments": [{
                "ContentType":   "application/pdf",
                "Filename":      f"dictamen_{numero.replace(' ', '_')}.pdf",
                "Base64Content": pdf_b64,
            }],
        }]
    }

    try:
        resp = mailjet.send.create(data=data)
        if resp.status_code == 200:
            return {"success": True, "message": f"Reporte enviado a {to_email}"}
        return {"success": False, "error": f"Mailjet respondió con status {resp.status_code}: {resp.json()}"}
    except Exception as exc:
        return {"success": False, "error": str(exc)}
