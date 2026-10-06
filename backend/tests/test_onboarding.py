"""Onboarding: the Get started steps are recorded the moment they happen and stay done, and hiding the card is kept on the account."""

from datetime import date, timedelta

from models.models import OnboardingStep

NOTHING_DONE = {"pet": False, "record": False, "photo": False, "question": False, "appointment": False, "tracking": False}
TODAY = date.today().isoformat()
NEXT_WEEK = (date.today() + timedelta(days=7)).isoformat()


def _steps(client, headers):
    r = client.get("/auth/me/getting-started", headers=headers)
    assert r.status_code == 200
    return r.json()


def _done(client, headers):
    return {step for step, done in _steps(client, headers).items() if done}


def test_getting_started_needs_a_login(client):
    """The steps belong to an account, so there is nothing to show or tick without one."""
    assert client.get("/auth/me/getting-started").status_code == 401
    assert client.post("/auth/me/getting-started/tracking").status_code == 401


def test_a_new_account_starts_with_nothing_done_and_the_card_showing(client, auth):
    """Signing up gives an empty checklist, and the card is not hidden."""
    headers = auth()
    assert _steps(client, headers) == NOTHING_DONE
    assert client.get("/auth/me", headers=headers).json()["onboarding_hidden"] is False


def test_each_step_ticks_the_moment_it_happens(client, auth, jpeg):
    """A pet, a record, a photo on it, a question, an appointment, then the trackers' introduction, each ticked by doing it."""
    headers = auth()
    pet_id = client.post("/pets", json={"name": "Rex", "species": "dog"}, headers=headers).json()["id"]
    assert _done(client, headers) == {"pet"}

    record_id = client.post(
        f"/pets/{pet_id}/records", json={"record_type": "Vet Visit", "title": "Checkup", "date": TODAY}, headers=headers,
    ).json()["id"]
    assert _done(client, headers) == {"pet", "record"}

    client.post(f"/records/{record_id}/photos", files={"files": ("x.jpg", jpeg(), "image/jpeg")}, headers=headers).raise_for_status()
    assert "photo" in _done(client, headers)

    # The corpus is empty in tests, so this declines without calling Claude, and still counts as asked
    client.post("/ask", json={"pet_id": pet_id, "question": "What should I feed my dog?"}, headers=headers).raise_for_status()
    assert "question" in _done(client, headers)

    client.post("/events", json={"pet_id": pet_id, "title": "Vaccine booster", "due_date": NEXT_WEEK}, headers=headers).raise_for_status()
    assert "appointment" in _done(client, headers)

    assert client.post("/auth/me/getting-started/tracking", headers=headers).status_code == 204
    assert _steps(client, headers) == dict.fromkeys(NOTHING_DONE, True)


def test_steps_stay_done_after_what_did_them_is_deleted(client, auth, jpeg):
    """Deleting the record, its photo, the appointment and even the pet leaves every step ticked."""
    headers = auth()
    pet_id = client.post("/pets", json={"name": "Rex", "species": "dog"}, headers=headers).json()["id"]
    record_id = client.post(
        f"/pets/{pet_id}/records", json={"record_type": "Symptom", "title": "Cough", "date": TODAY}, headers=headers,
    ).json()["id"]
    client.post(f"/records/{record_id}/photos", files={"files": ("x.jpg", jpeg(), "image/jpeg")}, headers=headers).raise_for_status()
    event_id = client.post("/events", json={"pet_id": pet_id, "title": "Recheck", "due_date": NEXT_WEEK}, headers=headers).json()["id"]

    client.delete(f"/events/{event_id}", headers=headers).raise_for_status()
    client.delete(f"/records/{record_id}", headers=headers).raise_for_status()
    client.delete(f"/pets/{pet_id}", headers=headers).raise_for_status()
    assert _done(client, headers) == {"pet", "record", "photo", "appointment"}


def test_done_on_a_due_item_counts_as_adding_a_record_but_a_weight_check_in_is_not_scheduling(client, pet):
    """A weight check-in is scheduled by the app, so it ticks nothing. Marking it Done creates a record, which ticks Add a health record."""
    headers, pet_data = pet
    pet_id = pet_data["id"]
    client.patch("/auth/me", json={"weight_tracking_enabled": True}, headers=headers).raise_for_status()
    client.patch(f"/pets/{pet_id}", json={"weight_tracking_enabled": True}, headers=headers).raise_for_status()
    checkin = client.get(f"/pets/{pet_id}/events", headers=headers).json()[0]
    assert checkin["kind"] == "Weight Check-in"
    assert _done(client, headers) == {"pet"}

    client.post(f"/events/{checkin['id']}/complete", headers=headers).raise_for_status()
    assert _done(client, headers) == {"pet", "record"}


def test_a_follow_up_counts_as_scheduling_on_a_new_record_or_one_being_edited(client, auth):
    """A next due date schedules a follow up, whether it comes with a new record or is added to an old one later."""
    with_due = auth(username="first", email="first@example.com")
    pet_id = client.post("/pets", json={"name": "Rex", "species": "dog"}, headers=with_due).json()["id"]
    client.post(
        f"/pets/{pet_id}/records",
        json={"record_type": "Medication", "title": "Dewormer", "date": TODAY, "next_due_date": NEXT_WEEK},
        headers=with_due,
    ).raise_for_status()
    assert "appointment" in _done(client, with_due)

    edited = auth(username="second", email="second@example.com")
    pet_id = client.post("/pets", json={"name": "Tom", "species": "cat"}, headers=edited).json()["id"]
    record_id = client.post(
        f"/pets/{pet_id}/records", json={"record_type": "Vaccination", "title": "Rabies", "date": TODAY}, headers=edited,
    ).json()["id"]
    assert "appointment" not in _done(client, edited)
    client.patch(f"/records/{record_id}", json={"next_due_date": NEXT_WEEK}, headers=edited).raise_for_status()
    assert "appointment" in _done(client, edited)


def test_each_step_is_kept_once_with_when_it_first_happened(client, pet, db):
    """Doing a step again keeps the first row, so its date says when the account first got there."""
    headers, _ = pet
    client.post("/auth/me/getting-started/tracking", headers=headers).raise_for_status()
    first = db.query(OnboardingStep).filter(OnboardingStep.step == "tracking").one().done_at
    client.post("/auth/me/getting-started/tracking", headers=headers).raise_for_status()
    client.post("/pets", json={"name": "Second", "species": "cat"}, headers=headers).raise_for_status()
    db.expire_all()
    assert db.query(OnboardingStep).filter(OnboardingStep.step == "tracking").one().done_at == first
    assert db.query(OnboardingStep).filter(OnboardingStep.step == "pet").count() == 1


def test_another_accounts_steps_tick_nothing(client, pet, auth):
    """The steps belong to the account that did them."""
    headers, pet_data = pet
    client.post(
        f"/pets/{pet_data['id']}/records", json={"record_type": "Symptom", "title": "Cough", "date": TODAY}, headers=headers,
    ).raise_for_status()
    other = auth(username="other", email="other@example.com")
    assert _steps(client, other) == NOTHING_DONE


def test_hiding_the_card_is_kept_on_the_account(client, auth):
    """Hide is saved on the account, so every device reading /auth/me sees it, and the Settings switch can undo it."""
    headers = auth()
    assert client.patch("/auth/me", json={"onboarding_hidden": True}, headers=headers).json()["onboarding_hidden"] is True
    assert client.get("/auth/me", headers=headers).json()["onboarding_hidden"] is True
    client.patch("/auth/me", json={"onboarding_hidden": False}, headers=headers).raise_for_status()
    assert client.get("/auth/me", headers=headers).json()["onboarding_hidden"] is False
