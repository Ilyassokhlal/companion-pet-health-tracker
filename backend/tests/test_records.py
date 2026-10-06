"""Health records."""


def test_record_requires_valid_type(client, pet):
    """Creating a record with an invalid type should return a 422 Unprocessable Entity error."""
    headers, pet_data = pet
    pet_id = pet_data["id"]
    r = client.post(f"/pets/{pet_id}/records", json={"record_type": "invalid_type"}, headers=headers)
    assert r.status_code == 422


def test_record_lifecycle(client, pet):
    """Create, list, patch, delete."""
    headers, pet_data = pet
    pet_id = pet_data["id"]
    # Create record
    r = client.post(f"/pets/{pet_id}/records", json={"record_type": "Vet Visit", "title": "Annual checkup", "date": "2026-01-15"}, headers=headers)
    assert r.status_code == 201
    record_id = r.json()["id"]

    # List records
    r = client.get(f"/pets/{pet_id}/records", headers=headers)
    assert r.status_code == 200
    assert any(rec["id"] == record_id for rec in r.json())

    # Patch record
    r = client.patch(f"/records/{record_id}", json={"description": "Updated checkup"}, headers=headers)
    assert r.status_code == 200
    assert r.json()["description"] == "Updated checkup"

    # Delete record
    r = client.delete(f"/records/{record_id}", headers=headers)
    assert r.status_code == 204

    # Ensure record is deleted
    r = client.get(f"/pets/{pet_id}/records", headers=headers)
    assert r.json() == []
