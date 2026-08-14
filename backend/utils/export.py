import csv
import io
from fpdf import FPDF
from fpdf.enums import XPos, YPos

def records_to_csv(pet, records) -> str:
    """Render a pet's records as CSV text."""

    buffer = io.StringIO()
    writer = csv.writer(buffer)


    writer.writerow(["Date", "Type", "Title", "Description", "Next due"])


    for record in sorted(records, key=lambda r: r.date):
        writer.writerow([
            record.date,
            record.record_type.value,
            record.title,
            record.description or "",
            record.next_due_date or "",
        ])


    return buffer.getvalue()


def records_to_pdf(pet, records) -> bytes:
    """Render a pet's records as a PDF."""
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("helvetica", size=11)

    def line(text: str) -> None:
        safe = text.encode("latin-1", "replace").decode("latin-1")
        pdf.cell(0, 10, safe, new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    line(f"{pet.name} - {pet.species} - {pet.breed or ''}")
    pdf.ln(5)

    for record in sorted(records, key=lambda r: r.date):
        line(f"{record.date} | {record.record_type.value} | {record.title} | {record.next_due_date or '-'}")

    return bytes(pdf.output())