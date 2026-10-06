"""Exporting a pet's data."""

import io
import zipfile


def test_the_export_zip_holds_one_csv_per_dataset(client, pet):
    """Test that the export zip contains one CSV file per dataset."""

    headers, pet_data = pet
    pet_id = pet_data["id"]
    client.post(f"/pets/{pet_id}/records", json={"title": "Annual check", "record_type": "Vet Visit", "date": "2026-08-15"}, headers=headers).raise_for_status()
    client.post(f"/pets/{pet_id}/walks", json={"date": "2026-08-16", "duration_minutes": 30, "distance_km": 2.5}, headers=headers).raise_for_status()
    client.post(f"/pets/{pet_id}/expenses", json={"date": "2026-08-15", "amount": 90, "category": "vet"}, headers=headers).raise_for_status()

    r = client.get(f"/pets/{pet_id}/export?format=zip", headers=headers)
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/zip"

    archive = zipfile.ZipFile(io.BytesIO(r.content))
    assert sorted(archive.namelist()) == ["expenses.csv", "feedings.csv", "records.csv", "walks.csv"]
    assert "Annual check" in archive.read("records.csv").decode("utf-8-sig")
    assert "2.5" in archive.read("walks.csv").decode("utf-8-sig")
    assert "vet" in archive.read("expenses.csv").decode("utf-8-sig")
    # Nothing was ever fed, but the member still exists carrying its header row.
    assert archive.read("feedings.csv").decode("utf-8-sig").startswith("Date,Time,Food")


def test_the_csv_format_still_returns_the_zip(client, pet):
    """Test that requesting CSV format still returns a ZIP archive."""
    headers, pet_data = pet
    r = client.get(f"/pets/{pet_data['id']}/export?format=csv", headers=headers)
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/zip"


def test_the_pdf_export_excludes_expenses(client, pet):
    """Test that the PDF export does not include expense details."""
    headers, pet_data = pet
    pet_id = pet_data["id"]
    client.post(
        f"/pets/{pet_id}/expenses",
        json={"date": "2026-08-15", "amount": 90, "category": "vet", "notes": "SECRETPRICE"},
        headers=headers,
    ).raise_for_status()

    r = client.get(f"/pets/{pet_id}/export?format=pdf", headers=headers)
    assert r.status_code == 200
    assert r.headers["content-type"] == "application/pdf"
    assert b"SECRETPRICE" not in r.content
