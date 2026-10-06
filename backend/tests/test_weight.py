"""Weight tracking and its check-ins."""

from datetime import date, timedelta

from utils.weight import next_checkin_date


def _enable_tracking(client, headers, pet_id, frequency="monthly"):
    """Test enabling weight tracking for the user and the pet."""
    client.patch("/auth/me", json={"weight_tracking_enabled": True}, headers=headers).raise_for_status()
    client.patch(
        f"/pets/{pet_id}",
        json={"weight_tracking_enabled": True, "weight_frequency": frequency},
        headers=headers,
    ).raise_for_status()


def _checkins(client, headers, pet_id):
    events = client.get(f"/pets/{pet_id}/events", headers=headers).json()
    return [event for event in events if event["kind"] == "Weight Check-in"]


def test_next_checkin_date_advances_without_sliding():
    """Test that the next check-in date advances correctly based on the frequency and current date."""
    assert next_checkin_date(date(2026, 8, 30), "weekly", date(2026, 8, 30)) == date(2026, 9, 6)
    assert next_checkin_date(date(2026, 8, 30), "biweekly", date(2026, 8, 30)) == date(2026, 9, 13)
    # Three months late: the 1st is still the 1st, and the missed cycles are not replayed.
    assert next_checkin_date(date(2026, 1, 1), "monthly", date(2026, 4, 15)) == date(2026, 5, 1)
    # Completed early, before it was even due.
    assert next_checkin_date(date(2026, 9, 1), "monthly", date(2026, 8, 25)) == date(2026, 10, 1)
    # A short month clamps instead of overflowing.
    assert next_checkin_date(date(2026, 1, 31), "monthly", date(2026, 1, 31)) == date(2026, 2, 28)


def test_switching_tracking_on_and_off_manages_the_checkin(client, pet):
    """Test that switching tracking on creates a check-in and switching it off removes it."""
    headers, pet_data = pet
    pet_id = pet_data["id"]

    _enable_tracking(client, headers, pet_id)
    checkins = _checkins(client, headers, pet_id)
    assert len(checkins) == 1
    assert checkins[0]["due_date"] == date.today().isoformat()

    client.patch(f"/pets/{pet_id}", json={"weight_tracking_enabled": False}, headers=headers).raise_for_status()
    assert _checkins(client, headers, pet_id) == []


def test_a_pending_checkin_blocks_the_next_one(client, pet):
    """Test that a pending check-in blocks the creation of the next one."""
    headers, pet_data = pet
    pet_id = pet_data["id"]

    _enable_tracking(client, headers, pet_id)
    client.patch(f"/pets/{pet_id}", json={"weight_frequency": "weekly"}, headers=headers).raise_for_status()
    client.patch("/auth/me", json={"timezone": "UTC"}, headers=headers).raise_for_status()

    assert len(_checkins(client, headers, pet_id)) == 1


def test_completing_a_checkin_schedules_the_next(client, pet):
    """Test that completing a check-in schedules the next one."""
    headers, pet_data = pet
    pet_id = pet_data["id"]

    _enable_tracking(client, headers, pet_id, frequency="weekly")
    checkin = _checkins(client, headers, pet_id)[0]

    r = client.post(f"/events/{checkin['id']}/complete", headers=headers)
    assert r.status_code == 201
    assert r.json()["record_type"] == "Weight"

    following = _checkins(client, headers, pet_id)
    assert len(following) == 1
    assert following[0]["due_date"] == (date.today() + timedelta(days=7)).isoformat()


def test_only_the_newest_weight_record_moves_the_pets_weight(client, pet):
    """Test that only the newest weight record updates the pet's displayed weight."""
    headers, pet_data = pet
    pet_id = pet_data["id"]

    old = client.post(
        f"/pets/{pet_id}/records",
        json={"record_type": "Weight", "title": "Weigh-in", "date": "2026-01-01", "weight_kg": 10.0},
        headers=headers,
    ).json()
    client.post(
        f"/pets/{pet_id}/records",
        json={"record_type": "Weight", "title": "Weigh-in", "date": "2026-08-01", "weight_kg": 12.0},
        headers=headers,
    ).raise_for_status()
    assert client.get(f"/pets/{pet_id}", headers=headers).json()["weight"] == 12.0

    client.patch(f"/records/{old['id']}", json={"weight_kg": 9.0}, headers=headers).raise_for_status()
    assert client.get(f"/pets/{pet_id}", headers=headers).json()["weight"] == 12.0


def test_turning_the_account_switch_off_turns_every_pet_off(client, pet):
    """Turning the account switch off disables weight tracking for all pets."""
    headers, pet_data = pet
    pet_id = pet_data["id"]
    second_id = client.post("/pets", json={"name": "Rex", "species": "dog"}, headers=headers).json()["id"]

    client.patch("/auth/me", json={"weight_tracking_enabled": True}, headers=headers).raise_for_status()
    for pid in (pet_id, second_id):
        client.patch(f"/pets/{pid}", json={"weight_tracking_enabled": True}, headers=headers).raise_for_status()
        assert len(_checkins(client, headers, pid)) == 1

    client.patch("/auth/me", json={"weight_tracking_enabled": False}, headers=headers).raise_for_status()

    for pid in (pet_id, second_id):
        assert client.get(f"/pets/{pid}", headers=headers).json()["weight_tracking_enabled"] is False
        assert _checkins(client, headers, pid) == []


def test_enabling_a_pet_turns_the_account_switch_on(client, pet):
    """Enabling weight tracking for a pet also enables it for the account."""
    headers, pet_data = pet
    assert client.get("/auth/me", headers=headers).json()["weight_tracking_enabled"] is False

    client.patch(f"/pets/{pet_data['id']}", json={"weight_tracking_enabled": True}, headers=headers).raise_for_status()

    assert client.get("/auth/me", headers=headers).json()["weight_tracking_enabled"] is True
    # is_tracked needs BOTH switches, so a check-in appearing proves the account flipped too.
    assert len(_checkins(client, headers, pet_data["id"])) == 1


def test_creating_a_pet_with_tracking_turns_the_account_switch_on(client, auth):
    """Creating a pet with weight tracking enabled also turns on the account switch."""
    headers = auth()
    r = client.post(
        "/pets",
        json={"name": "Fluffy", "species": "cat", "weight_tracking_enabled": True},
        headers=headers,
    )
    assert r.status_code == 201
    assert client.get("/auth/me", headers=headers).json()["weight_tracking_enabled"] is True
    assert len(_checkins(client, headers, r.json()["id"])) == 1


def test_an_unrelated_preference_change_leaves_tracking_alone(client, pet):
    """Changing an unrelated account preference does not affect weight tracking."""
    headers, pet_data = pet
    pet_id = pet_data["id"]
    client.patch(f"/pets/{pet_id}", json={"weight_tracking_enabled": True}, headers=headers).raise_for_status()

    client.patch("/auth/me", json={"reminder_frequency": "daily"}, headers=headers).raise_for_status()

    assert client.get(f"/pets/{pet_id}", headers=headers).json()["weight_tracking_enabled"] is True
    assert len(_checkins(client, headers, pet_id)) == 1
