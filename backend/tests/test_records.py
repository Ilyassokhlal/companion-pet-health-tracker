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


def test_records_come_in_pages_newest_first(client, pet):
    """With a limit the records arrive a page at a time, newest first, and a type filter applies before the paging. Without one every record comes back, as the apps from before paging expect."""
    headers, pet_data = pet
    pet_id = pet_data["id"]
    for day in range(1, 6):
        record_type = "Vaccination" if day % 2 else "Vet Visit"
        client.post(f"/pets/{pet_id}/records", json={"record_type": record_type, "title": f"Day {day}", "date": f"2026-03-0{day}"}, headers=headers).raise_for_status()
    # Two on the same day: the one added last comes first
    client.post(f"/pets/{pet_id}/records", json={"record_type": "Symptom", "title": "Day 5, later", "date": "2026-03-05"}, headers=headers).raise_for_status()

    pages = [client.get(f"/pets/{pet_id}/records", params={"limit": 2, "offset": offset}, headers=headers).json() for offset in (0, 2, 4, 6)]
    assert [[r["title"] for r in page] for page in pages] == [["Day 5, later", "Day 5"], ["Day 4", "Day 3"], ["Day 2", "Day 1"], []]

    vaccinations = client.get(f"/pets/{pet_id}/records", params={"record_type": "Vaccination", "limit": 2}, headers=headers).json()
    assert [r["title"] for r in vaccinations] == ["Day 5", "Day 3"]
    both = client.get(f"/pets/{pet_id}/records", params={"record_type": ["Vaccination", "Symptom"]}, headers=headers).json()
    assert [r["title"] for r in both] == ["Day 5, later", "Day 5", "Day 3", "Day 1"]

    assert len(client.get(f"/pets/{pet_id}/records", headers=headers).json()) == 6
    assert client.get(f"/pets/{pet_id}/records", params={"limit": 101}, headers=headers).status_code == 422
    assert client.get(f"/pets/{pet_id}/records", params={"limit": 0}, headers=headers).status_code == 422


def test_record_counts_cover_every_type_the_pet_has(client, auth, pet):
    """The filter buttons count every record, including the ones a paged list has not loaded, and only for the owner."""
    headers, pet_data = pet
    pet_id = pet_data["id"]
    assert client.get(f"/pets/{pet_id}/record-counts", headers=headers).json() == {}

    for record_type in ("Vaccination", "Vaccination", "Vet Visit"):
        client.post(f"/pets/{pet_id}/records", json={"record_type": record_type, "title": "Check", "date": "2026-03-01"}, headers=headers).raise_for_status()
    assert client.get(f"/pets/{pet_id}/record-counts", headers=headers).json() == {"Vaccination": 2, "Vet Visit": 1}

    other = auth(username="other", email="other@example.com")
    assert client.get(f"/pets/{pet_id}/record-counts", headers=other).status_code == 404
