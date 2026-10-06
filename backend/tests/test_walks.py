"""Walks."""


def test_logging_a_walk_returns_it_and_lists_newest_first(client, pet):
    """Logging a walk returns it and ensures the newest walks appear first."""
    headers, pet_data = pet
    pet_id = pet_data["id"]

    older = client.post(f"/pets/{pet_id}/walks", json={"date": "2026-08-20", "duration_minutes": 30}, headers=headers)
    assert older.status_code == 201
    assert older.json()["distance_km"] is None
    assert older.json()["notes"] is None

    client.post(f"/pets/{pet_id}/walks", json={"date": "2026-08-27", "duration_minutes": 45, "distance_km": 3.2, "notes": "Limped a little."}, headers=headers).raise_for_status()

    walks = client.get(f"/pets/{pet_id}/walks", headers=headers).json()
    assert [w["date"] for w in walks] == ["2026-08-27", "2026-08-20"]
    assert walks[0]["distance_km"] == 3.2


def test_a_zero_minute_walk_is_refused(client, pet):
    """A walk with zero duration is invalid and should be refused."""
    headers, pet_data = pet
    r = client.post(f"/pets/{pet_data['id']}/walks", json={"date": "2026-08-27", "duration_minutes": 0}, headers=headers)
    assert r.status_code == 422


def test_walks_are_isolated_between_users(client, auth, pet):
    """Walks created by one user are not accessible by another user."""
    headers_a, pet_a = pet
    walk_id = client.post(f"/pets/{pet_a['id']}/walks", json={"date": "2026-08-27", "duration_minutes": 30}, headers=headers_a).json()["id"]

    headers_b = auth(username="userb", email="userb@example.com")
    assert client.get(f"/pets/{pet_a['id']}/walks", headers=headers_b).status_code == 404
    assert client.delete(f"/walks/{walk_id}", headers=headers_b).status_code == 404
    assert len(client.get(f"/pets/{pet_a['id']}/walks", headers=headers_a).json()) == 1


def test_turning_the_walk_switch_off_turns_every_pet_off(client, pet):
    """Turning the account-level walk tracking off should turn it off for all pets."""
    headers, pet_data = pet
    pet_id = pet_data["id"]
    second_id = client.post("/pets", json={"name": "Rex", "species": "dog"}, headers=headers).json()["id"]

    for pid in (pet_id, second_id):
        client.patch(f"/pets/{pid}", json={"walk_tracking_enabled": True}, headers=headers).raise_for_status()
    assert client.get("/auth/me", headers=headers).json()["walk_tracking_enabled"] is True

    client.patch("/auth/me", json={"walk_tracking_enabled": False}, headers=headers).raise_for_status()

    for pid in (pet_id, second_id):
        assert client.get(f"/pets/{pid}", headers=headers).json()["walk_tracking_enabled"] is False


def test_enabling_walks_on_a_pet_turns_the_account_switch_on(client, pet):
    """Enabling walk tracking on a pet should turn on the account-level walk tracking."""
    headers, pet_data = pet
    assert client.get("/auth/me", headers=headers).json()["walk_tracking_enabled"] is False

    client.patch(f"/pets/{pet_data['id']}", json={"walk_tracking_enabled": True}, headers=headers).raise_for_status()

    assert client.get("/auth/me", headers=headers).json()["walk_tracking_enabled"] is True
