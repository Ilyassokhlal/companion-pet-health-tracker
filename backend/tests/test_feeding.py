"""Feeding: the meals logged for a pet."""


def test_feedings_come_in_pages_latest_first(client, pet):
    """The feeding log loads a page at a time, latest meal first, and the day filter still applies."""
    headers, pet_data = pet
    pet_id = pet_data["id"]
    for day, time in (("2026-08-01", "08:00"), ("2026-08-01", "18:00"), ("2026-08-02", "08:00"), ("2026-08-02", "18:00"), ("2026-08-02", "18:00")):
        client.post(f"/pets/{pet_id}/feedings", json={"date": day, "time": time}, headers=headers).raise_for_status()

    first = client.get(f"/pets/{pet_id}/feedings", params={"limit": 3}, headers=headers).json()
    rest = client.get(f"/pets/{pet_id}/feedings", params={"limit": 3, "offset": 3}, headers=headers).json()
    assert [(f["date"], f["time"][:5]) for f in first + rest] == [
        ("2026-08-02", "18:00"),
        ("2026-08-02", "18:00"),
        ("2026-08-02", "08:00"),
        ("2026-08-01", "18:00"),
        ("2026-08-01", "08:00"),
    ]
    # Two meals at the same minute keep a fixed order, the one logged last first
    assert first[0]["id"] > first[1]["id"]

    assert len(client.get(f"/pets/{pet_id}/feedings", params={"on": "2026-08-01"}, headers=headers).json()) == 2
