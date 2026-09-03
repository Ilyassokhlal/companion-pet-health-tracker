import csv
import io
import zipfile
from datetime import date as date_type

from fpdf import FPDF
from fpdf.enums import XPos, YPos


def _csv(header: list[str], rows) -> str:
    """Render a CSV document from a header and rows."""
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(header)
    for row in rows:
        writer.writerow(row)
    return buffer.getvalue()


def records_to_csv(pet, records) -> str:
    """Render a pet's health records as CSV text."""
    return _csv(
        ["Date", "Type", "Title", "Description", "Next due"],
        (
            [r.date, r.record_type.value, r.title, r.description or "", r.next_due_date or ""]
            for r in sorted(records, key=lambda r: r.date)
        ),
    )


def walks_to_csv(walks) -> str:
    """Render a pet's walking log as CSV text."""
    return _csv(
        ["Date", "Duration (minutes)", "Distance (km)", "Notes"],
        (
            [w.date, w.duration_minutes, "" if w.distance_km is None else w.distance_km, w.notes or ""]
            for w in sorted(walks, key=lambda w: w.date)
        ),
    )


def feedings_to_csv(feedings) -> str:
    """Render a pet's feeding log as CSV text."""
    return _csv(
        ["Date", "Time", "Food", "Amount", "Unit", "Notes"],
        (
            [f.date, f.time, f.food or "", "" if f.amount is None else f.amount, f.amount_unit or "", f.notes or ""]
            for f in sorted(feedings, key=lambda f: (f.date, f.time))
        ),
    )


def expenses_to_csv(expenses) -> str:
    """Render a pet's expenses as CSV text. Amounts do not convert between currencies."""
    return _csv(
        ["Date", "Amount", "Currency", "Category", "Notes"],
        (
            [e.date, e.amount, e.currency, e.category, e.notes or ""]
            for e in sorted(expenses, key=lambda e: e.date)
        ),
    )


def export_zip(pet, records, walks, feedings, expenses) -> bytes:
    """Export all four datasets as a zip archive, with one CSV per dataset.

    Each dataset is included as a separate CSV file within the archive. All files are included even if empty."""
    buffer = io.BytesIO()
    members = {
        "records.csv": records_to_csv(pet, records),
        "walks.csv": walks_to_csv(walks),
        "feedings.csv": feedings_to_csv(feedings),
        "expenses.csv": expenses_to_csv(expenses),
    }
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for name, content in members.items():
            # Write each CSV file to the archive with UTF-8 BOM for Excel compatibility.
            archive.writestr(name, content.encode("utf-8-sig"))
    return buffer.getvalue()


def _hm(minutes: int) -> str:
    """Convert minutes into a human-readable string like '3h 20m'."""
    hours, rest = divmod(minutes, 60)
    return f"{hours}h {rest}m" if hours else f"{rest}m"


def _walk_months(walks):
    """Render a pet's walks aggregated by month.

    Returns an iterator of (month label, walk count, total minutes, total km) tuples. Aggregates walks by calendar month, newest first."""
    buckets: dict[date_type, list] = {}
    for walk in walks:
        key = date_type(walk.date.year, walk.date.month, 1)
        bucket = buckets.setdefault(key, [0, 0, 0.0])
        bucket[0] += 1
        bucket[1] += walk.duration_minutes
        bucket[2] += walk.distance_km or 0.0
    for key in sorted(buckets, reverse=True):
        count, minutes, km = buckets[key]
        yield key.strftime("%B %Y"), count, minutes, km


def records_to_pdf(pet, records, walks, feeding_times) -> bytes:
    """Render a pet's health records, walks, and feeding schedule as a PDF.

    Returns the PDF as a byte string. Rendered content includes health records, walks by month, and the feeding schedule."""
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("helvetica", size=11)

    def line(text: str) -> None:
        safe = text.encode("latin-1", "replace").decode("latin-1")
        pdf.cell(0, 10, safe, new_x=XPos.LMARGIN, new_y=YPos.NEXT)

    def heading(text: str) -> None:
        pdf.set_font("helvetica", style="B", size=12)
        line(text)
        pdf.set_font("helvetica", size=11)

    # Empty parts are dropped rather than leaving a dangling " - ", which the old f-string did whenever a pet had no breed.
    details = [pet.species, pet.breed or "", pet.sex or "", "neutered or spayed" if pet.neutered else ""]
    line(" - ".join([pet.name, *[part for part in details if part]]))
    pdf.ln(5)

    heading("Health records")
    if not records:
        line("None recorded.")
    for record in sorted(records, key=lambda r: r.date):
        line(f"{record.date} | {record.record_type.value} | {record.title} | {record.next_due_date or '-'}")
    pdf.ln(5)

    heading("Walks by month")
    months = list(_walk_months(walks))
    if not months:
        line("None recorded.")
    for label, count, minutes, km in months:
        distance = f" | {round(km, 1)} km" if km else ""
        line(f"{label} | {count} walks | {_hm(minutes)}{distance}")
    pdf.ln(5)

    heading("Feeding schedule")
    if not feeding_times:
        line("No feeding times set.")
    else:
        line(", ".join(t.time.strftime("%H:%M") for t in sorted(feeding_times, key=lambda t: t.time)))

    return bytes(pdf.output())