from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import HRFlowable, Paragraph, SimpleDocTemplate, Spacer


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "resume" / "RotugalJasmine.pdf"

INK = colors.HexColor("#172538")
MUTED = colors.HexColor("#45566B")
ACCENT = colors.HexColor("#2457A6")


def build_resume():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    document = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=letter,
        rightMargin=0.78 * inch,
        leftMargin=0.78 * inch,
        topMargin=0.65 * inch,
        bottomMargin=0.62 * inch,
        title="Jasmine L. Rotugal - Resume",
        author="Jasmine L. Rotugal",
        subject="Information Technology Student",
    )
    base = getSampleStyleSheet()
    styles = {
        "name": ParagraphStyle(
            "ResumeName",
            parent=base["Title"],
            fontName="Helvetica-Bold",
            fontSize=25,
            leading=29,
            textColor=INK,
            alignment=TA_LEFT,
            spaceAfter=5,
        ),
        "headline": ParagraphStyle(
            "ResumeHeadline",
            parent=base["Normal"],
            fontName="Helvetica",
            fontSize=10.5,
            leading=15,
            textColor=ACCENT,
            spaceAfter=13,
        ),
        "heading": ParagraphStyle(
            "ResumeSection",
            parent=base["Heading2"],
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=13,
            textColor=ACCENT,
            spaceBefore=13,
            spaceAfter=5,
            uppercase=True,
        ),
        "body": ParagraphStyle(
            "ResumeBody",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=14,
            textColor=INK,
            spaceAfter=5,
        ),
        "institution": ParagraphStyle(
            "ResumeInstitution",
            parent=base["BodyText"],
            fontName="Helvetica-Bold",
            fontSize=10,
            leading=14,
            textColor=INK,
            spaceAfter=2,
        ),
        "detail": ParagraphStyle(
            "ResumeDetail",
            parent=base["BodyText"],
            fontName="Helvetica",
            fontSize=9.5,
            leading=14,
            textColor=MUTED,
            spaceAfter=4,
        ),
    }

    story = [
        Paragraph("Jasmine L. Rotugal", styles["name"]),
        Paragraph(
            "BSIT Student &nbsp;|&nbsp; Aspiring Cybersecurity and Network Security Professional",
            styles["headline"],
        ),
        HRFlowable(width="100%", thickness=1.2, color=ACCENT, spaceAfter=10),
        Paragraph("PROFESSIONAL SUMMARY", styles["heading"]),
        Paragraph(
            "Bachelor of Science in Information Technology student at Isabela State University "
            "– Cauayan, with a career focus on cybersecurity and network security.",
            styles["body"],
        ),
        Paragraph("CAREER OBJECTIVE", styles["heading"]),
        Paragraph(
            "Build a career in cybersecurity and network security by continuing to develop "
            "knowledge through information technology education and future professional opportunities.",
            styles["body"],
        ),
        Paragraph("EDUCATION", styles["heading"]),
        Paragraph("Isabela State University – Cauayan", styles["institution"]),
        Paragraph(
            "Bachelor of Science in Information Technology (BSIT) &nbsp;|&nbsp; Expected 2027",
            styles["detail"],
        ),
        Paragraph("AREAS OF INTEREST", styles["heading"]),
        Paragraph("Cybersecurity &nbsp;•&nbsp; Network security", styles["body"]),
        Spacer(1, 8),
        HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#C8D1DE")),
    ]

    def draw_page(canvas, doc):
        canvas.saveState()
        canvas.setTitle("Jasmine L. Rotugal - Resume")
        canvas.setAuthor("Jasmine L. Rotugal")
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(MUTED)
        canvas.drawString(doc.leftMargin, 0.38 * inch, "Jasmine L. Rotugal")
        canvas.drawRightString(letter[0] - doc.rightMargin, 0.38 * inch, "Resume · 2027")
        canvas.restoreState()

    document.build(story, onFirstPage=draw_page, onLaterPages=draw_page)
    print(f"Generated {OUTPUT}")


if __name__ == "__main__":
    build_resume()
