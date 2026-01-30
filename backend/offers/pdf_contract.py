# backend/offers/pdf_contract.py
from io import BytesIO
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    KeepTogether,
)
from reportlab.pdfbase.pdfmetrics import stringWidth


def _safe(obj, attr, default=""):
    try:
        val = getattr(obj, attr, default)
        return val if val is not None else default
    except Exception:
        return default


def _fmt_date(d):
    if not d:
        return "-"
    try:
        return d.strftime("%d.%m.%Y")
    except Exception:
        return str(d)


def _money(amount, currency="EUR"):
    if amount is None or amount == "":
        return "-"
    try:
        return f"{amount:.2f} {currency}"
    except Exception:
        return f"{amount} {currency}"


def build_offer_contract_pdf(offer) -> bytes:
    """
    Returns PDF bytes for a professional Albanian contract.
    """
    buf = BytesIO()

    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=18 * mm,
        title="Kontratë / Ofertë",
        author="Ndertimnet",
    )

    styles = getSampleStyleSheet()

    # Brand-ish styles (clean, contract-like)
    H1 = ParagraphStyle(
        "H1",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=16,
        leading=19,
        spaceAfter=6,
    )
    H2 = ParagraphStyle(
        "H2",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=11.5,
        leading=14,
        spaceBefore=10,
        spaceAfter=6,
    )
    P = ParagraphStyle(
        "P",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=10.3,
        leading=14,
        spaceAfter=6,
    )
    SMALL = ParagraphStyle(
        "SMALL",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#4B5563"),
    )
    MUTED = ParagraphStyle(
        "MUTED",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor("#374151"),
    )

    # Data extraction
    version = getattr(offer, "current_version", None)
    company = getattr(offer, "company", None)
    job = getattr(offer, "job_request", None)

    # Company fields
    company_name = _safe(company, "company_name", "Kompani")
    company_phone = _safe(company, "phone", "-")
    company_address = _safe(company, "address", "-")
    company_website = _safe(company, "website", "-")
    company_org = _safe(company, "org_number", "-")

    # Customer fields (best-effort; adapt later if your JobRequest differs)
    customer_name = "-"
    customer_phone = "-"
    customer_address = "-"
    try:
        # common patterns: job.customer.user.first_name etc.
        cust = getattr(job, "customer", None)
        user = getattr(cust, "user", None) if cust else None
        fn = _safe(user, "first_name", "")
        ln = _safe(user, "last_name", "")
        customer_name = (f"{fn} {ln}").strip() or _safe(user, "email", "-")
        customer_phone = _safe(cust, "phone", "-")
        customer_address = _safe(cust, "address", "-")
    except Exception:
        pass

    # Job request (best-effort)
    job_title = _safe(job, "title", f"Kërkesë pune #{_safe(job,'id','-')}")
    job_desc = _safe(job, "description", _safe(job, "details", "-"))
    job_city = "-"
    try:
        city_obj = getattr(job, "city", None)
        job_city = _safe(city_obj, "name", "-") if city_obj else _safe(job, "city_name", "-")
    except Exception:
        job_city = "-"

    # Offer version fields
    presentation = _safe(version, "presentation_text", "") if version else ""
    can_start_from = _fmt_date(_safe(version, "can_start_from", None)) if version else "-"
    duration_text = _safe(version, "duration_text", "-") if version else "-"
    price_type = _safe(version, "price_type", "-") if version else "-"
    price_amount = _safe(version, "price_amount", None) if version else None
    currency = _safe(version, "currency", "EUR") if version else "EUR"
    includes_text = _safe(version, "includes_text", "") if version else ""
    excludes_text = _safe(version, "excludes_text", "") if version else ""
    payment_terms = _safe(version, "payment_terms", "") if version else ""

    # Signature (masked)
    pn_masked = "-"
    signed_at = "-"
    try:
        sig = getattr(version, "signature", None)
        if sig:
            pn_masked = _safe(sig, "personnummer_masked", "-")
            signed_at = _fmt_date(_safe(sig, "signed_at", None))
    except Exception:
        pass

    offer_id = _safe(offer, "id", "-")
    version_no = _safe(version, "version_number", "-") if version else "-"
    issued_date = _fmt_date(datetime.now())

    # Build content
    story = []

    # Header bar (simple, professional)
    story.append(Paragraph("NDERITMNET", ParagraphStyle("brand", parent=SMALL, fontSize=10, leading=12, textColor=colors.HexColor("#111827"))))
    story.append(Paragraph("Kontratë – Ofertë për Shërbime Ndërtimore", H1))
    story.append(Paragraph(f"Nr. Ofertës: <b>#{offer_id}</b> &nbsp;&nbsp;|&nbsp;&nbsp; Versioni: <b>v{version_no}</b> &nbsp;&nbsp;|&nbsp;&nbsp; Data: <b>{issued_date}</b>", MUTED))
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E5E7EB")))
    story.append(Spacer(1, 10))

    # Parties section
    story.append(Paragraph("1. Palët Kontraktuese", H2))

    parties_table = Table(
        [
            ["Pala A (Ofruesi / Kompania)", "Pala B (Klienti)"],
            [
                Paragraph(f"<b>{company_name}</b><br/>Nr. Biznesit/Org: {company_org}<br/>Tel: {company_phone}<br/>Adresa: {company_address}<br/>Web: {company_website}", P),
                Paragraph(f"<b>{customer_name}</b><br/>Tel: {customer_phone}<br/>Adresa: {customer_address}", P),
            ],
        ],
        colWidths=[85 * mm, 85 * mm],
    )
    parties_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F3F4F6")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#111827")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 9.5),
                ("ALIGN", (0, 0), (-1, 0), "LEFT"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("GRID", (0, 0), (-1, -1), 0.6, colors.HexColor("#E5E7EB")),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(parties_table)

    story.append(Spacer(1, 10))

    # Subject / Job
    story.append(Paragraph("2. Objekt i Kontratës", H2))
    story.append(Paragraph(f"<b>Projekti:</b> {job_title}", P))
    story.append(Paragraph(f"<b>Lokacioni:</b> {job_city}", P))
    story.append(Paragraph(f"<b>Përshkrimi:</b> {job_desc or '-'}", P))

    story.append(Spacer(1, 8))
    story.append(Paragraph("3. Përshkrimi i Kompanisë", H2))
    story.append(Paragraph(presentation or "-", P))

    # Timeline
    story.append(Paragraph("4. Afatet dhe Organizimi", H2))
    timeline_table = Table(
        [
            ["FILLIMI I MUNDSHËM", "KOHËZGJATJA E PARASHIKUAR"],
            [can_start_from, duration_text],
        ],
        colWidths=[85 * mm, 85 * mm],
    )
    timeline_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F9FAFB")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 9.5),
                ("GRID", (0, 0), (-1, -1), 0.6, colors.HexColor("#E5E7EB")),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )
    story.append(timeline_table)

    # Price
    story.append(Paragraph("5. Çmimi dhe Kushtet Financiare", H2))
    price_label = "Çmim fiks" if str(price_type).lower() == "fixed" else ("Çmim për orë" if str(price_type).lower() == "hourly" else str(price_type))
    story.append(Paragraph(f"<b>Lloji i çmimit:</b> {price_label}", P))
    story.append(Paragraph(f"<b>Shuma:</b> {_money(price_amount, currency)}", P))

    if includes_text:
        story.append(Paragraph("<b>Përfshin:</b>", P))
        story.append(Paragraph(includes_text, P))
    if excludes_text:
        story.append(Paragraph("<b>Nuk përfshin:</b>", P))
        story.append(Paragraph(excludes_text, P))
    if payment_terms:
        story.append(Paragraph("<b>Kushtet e pagesës:</b>", P))
        story.append(Paragraph(payment_terms, P))

    # Process info + chat policy (per your updated logic)
    story.append(Paragraph("6. Procesi dhe Komunikimi", H2))
    story.append(Paragraph(
        "• Deri në pranimin nga Klienti, oferta mund të ndryshohet nga Kompania. "
        "Në rast ndryshimi pas nënshkrimit, kërkohet nënshkrim i ri për versionin e përditësuar.",
        P
    ))
    story.append(Paragraph(
        "• Pas pranimit të ofertës nga Klienti, komunikimi në chat zhbllokohet automatikisht pa pagesë.",
        P
    ))
    story.append(Paragraph(
        "• Nëse Kompania dëshiron chat para pranimit, mund ta zhbllokojë paraprakisht (sipas politikës së platformës).",
        P
    ))

    # Signature block
    story.append(Paragraph("7. Nënshkrimi", H2))

    sign_note = Paragraph(
        "Me nënshkrim, Kompania deklaron se e ka lexuar dhe pranon përmbajtjen e kësaj oferte/kontrate.",
        P
    )

    sig_table = Table(
        [
            ["KOMPANIA (Pala A)", "KLIENTI (Pala B)"],
            [
                Paragraph(
                    f"<b>{company_name}</b><br/>Nënshkrimi: __________________________<br/>"
                    f"Nr. Personal (i maskuar): {pn_masked}<br/>Data e nënshkrimit: {signed_at}",
                    P,
                ),
                Paragraph(
                    "<b>________________________________</b><br/>Nënshkrimi: __________________________<br/>Data: __________________________",
                    P,
                ),
            ],
        ],
        colWidths=[85 * mm, 85 * mm],
    )
    sig_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F3F4F6")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, 0), 9.5),
                ("GRID", (0, 0), (-1, -1), 0.6, colors.HexColor("#E5E7EB")),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ]
        )
    )
    story.append(KeepTogether([sign_note, Spacer(1, 6), sig_table]))

    # Legal references (short, official, Albanian)
    story.append(Paragraph("8. Referenca Ligjore (Republika e Kosovës)", H2))
    story.append(Paragraph(
        "Kjo kontratë/ofertë bazohet në parimet dhe dispozitat e Ligjit Nr. 04/L-077 për Marrëdhëniet e Detyrimeve.",
        P
    ))
    story.append(Paragraph(
        "• Neni 2 (Autonomia e vullnetit): “... janë të lirë ... t’i rregullojnë marrëdhëniet ... sipas vullnetit ...”",
        SMALL
    ))
    story.append(Paragraph(
        "• Neni 15 (Lidhja e kontratës): “Kontrata është e lidhur kur palët ... janë marrë vesh për elementet thelbësore ...”",
        SMALL
    ))
    story.append(Paragraph(
        "• Neni 18(2): “Shprehja e vullnetit duhet të bëhet lirisht dhe seriozisht.”",
        SMALL
    ))
    story.append(Paragraph(
        "• Neni 51(1): “Lidhja e kontratës nuk i nënshtrohet asnjë forme, përveç nëse me ligj është caktuar ndryshe.”",
        SMALL
    ))
    story.append(Paragraph(
        "• Neni 57(1): “... kontrata është e lidhur kur dokumentin ta nënshkruajnë të gjithë personat ...”",
        SMALL
    ))

    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#E5E7EB")))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "Ky dokument është gjeneruar elektronikisht nga platforma Ndertimnet dhe përfaqëson versionin aktual të ofertës.",
        SMALL
    ))

    def _footer(canvas, doc_):
        canvas.saveState()
        w, h = A4

        # Footer line
        canvas.setStrokeColor(colors.HexColor("#E5E7EB"))
        canvas.setLineWidth(0.8)
        canvas.line(18 * mm, 16 * mm, (w - 18 * mm), 16 * mm)

        # Page number
        page = canvas.getPageNumber()
        footer_text = f"Faqe {page}"
        canvas.setFont("Helvetica", 9)
        canvas.setFillColor(colors.HexColor("#6B7280"))
        canvas.drawRightString(w - 18 * mm, 10.5 * mm, footer_text)

        # Left footer label
        left_text = f"Ofertë #{offer_id} • v{version_no}"
        canvas.drawString(18 * mm, 10.5 * mm, left_text)

        canvas.restoreState()

    doc.build(story, onFirstPage=_footer, onLaterPages=_footer)

    pdf = buf.getvalue()
    buf.close()
    return pdf
