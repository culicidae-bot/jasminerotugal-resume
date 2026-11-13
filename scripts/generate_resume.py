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
        subject="BSIT student focused on cybersecurity and network security",
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
            "BSIT Student | Aspiring Cybersecurity and Network Security Professional",
            styles["headline"],
        ),
        HRFlowable(width="100%", thickness=1.2, color=ACCENT, spaceAfter=10),
        Paragraph("PROFESSIONAL SUMMARY", styles["heading"]),
        Paragraph(
            "BSIT student at Isabela State University – Cauayan Campus focusing on cybersecurity "
            "and network security. I took part in the PacketCapture CTF and solved an OSINT "
            "challenge by following clues from an image through public social media posts.",
            styles["body"],
        ),
        Paragraph("CAREER OBJECTIVE", styles["heading"]),
        Paragraph(
            "To build a career in cybersecurity and network security by applying my information "
            "technology education and continuing to learn.",
            styles["body"],
        ),
        Paragraph("EDUCATION", styles["heading"]),
        Paragraph("Isabela State University – Cauayan Campus", styles["institution"]),
        Paragraph(
            "Bachelor of Science in Information Technology (BSIT)",
            styles["detail"],
        ),
        Paragraph("Expected graduation: 2027", styles["detail"]),
        Paragraph("AREAS OF INTEREST", styles["heading"]),
        Paragraph("Cybersecurity and network security", styles["body"]),
        Spacer(1, 8),
        HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#C8D1DE")),
    ]

    document.build(story)
    print(f"Generated {OUTPUT}")


if __name__ == "__main__":
    build_resume()
