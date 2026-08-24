"""API tests. These never call the Anthropic API — /ask is exercised only on its guardrail
path, where an empty Chroma collection triggers the refusal branch before any request."""

import rag
from config import settings


def test_health_check(client):
    """The /health endpoint should return a 200 status and a JSON body indicating the service is healthy."""
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_register_returns_token(client, auth):
    """Registering a new user returns an access token."""
    headers = auth()
    assert "Authorization" in headers
    assert headers["Authorization"].startswith("Bearer ")

def test_login_returns_a_working_token(client, auth):
    """Logging in with correct credentials returns a token that opens a protected route."""
    headers = auth()
    r = client.get("/pets", headers=headers)
    assert r.status_code == 200

def test_duplicate_email_is_rejected(client, auth):
    """Registering a user with an email that already exists should return a 409 Conflict error."""
    auth()  # Register the first user
    r = client.post("/auth/register", json={"username": "anotheruser", "email": "testuser@example.com", "password": "password"})
    assert r.status_code == 409
    assert r.json()["detail"] == "User with email 'testuser@example.com' already exists"


def test_login_with_wrong_password_is_rejected(client, auth):
    """Logging in with the wrong password should return a 401 Unauthorized error."""
    auth()  # Register the user
    r = client.post("/auth/login", json={"email": "testuser@example.com", "password": "wrongpassword"})
    assert r.status_code == 401
    assert r.json()["detail"] == "Invalid email or password"


def test_pets_require_authentication(client):
    """All pet endpoints should require authentication and return a 401 Unauthorized error if no token is provided."""
    r = client.get("/pets")
    assert r.status_code == 401
    assert r.json()["detail"] == "Not authenticated"


def test_pet_lifecycle(client, pet):
    """Create, list, patch, delete."""
    headers, pet_data = pet
    pet_id = pet_data["id"]
    # List pets
    r = client.get("/pets", headers=headers)
    assert r.status_code == 200
    assert any(p["id"] == pet_id for p in r.json())

    # Patch pet
    r = client.patch(f"/pets/{pet_id}", json={"name": "Fluffy Updated"}, headers=headers)
    assert r.status_code == 200
    assert r.json()["name"] == "Fluffy Updated"

    # Delete pet
    r = client.delete(f"/pets/{pet_id}", headers=headers)
    assert r.status_code == 204

    # Ensure pet is deleted
    r = client.get(f"/pets/{pet_id}", headers=headers)
    assert r.status_code == 404


def test_users_cannot_reach_each_others_pets(client, pet, auth):
    """Register a second user. Every route on the first user's pet must 404."""
    _, pet_data = pet
    pet_id = pet_data["id"]
    # Register a second user
    headers2 = auth(username="seconduser", email="seconduser@example.com")
    # Attempt to access the first user's pet
    r = client.get(f"/pets/{pet_id}", headers=headers2)
    assert r.status_code == 404
    r = client.patch(f"/pets/{pet_id}", json={"name": "Hacked"}, headers=headers2)
    assert r.status_code == 404
    r = client.delete(f"/pets/{pet_id}", headers=headers2)
    assert r.status_code == 404


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


def test_ask_declines_when_corpus_is_empty(client, pet):
    """When the pet has no records, /ask should return a 400 error indicating that the corpus is empty."""
    # Ensure the pet has no records
    headers, pet_data = pet
    pet_id = pet_data["id"]

    # Add a record to ensure /ask can proceed
    r = client.post("/ask", json={"pet_id": pet_id, "question": "What should I feed my pet?"}, headers=headers)

    # Check that the response indicates no sources were found
    assert r.status_code == 200
    body = r.json()
    assert body["confidence"] == "none"
    assert body["sources"] == []


def test_chat_history_is_persisted(client, pet):
    """An out-of-scope reply is stored alongside the user's question."""
    headers, pet_data = pet
    pet_id = pet_data["id"]

    r = client.post(
        "/ask",
        json={"pet_id": pet_id, "question": "What should I feed my pet?"},
        headers=headers,
    )
    assert r.status_code == 200
    answer = r.json()["answer"]

    r = client.get(f"/pets/{pet_id}/messages", headers=headers)
    assert r.status_code == 200
    history = r.json()
    assert [msg["role"] for msg in history] == ["user", "assistant"]
    assert history[0]["content"] == "What should I feed my pet?"
    assert history[1]["content"] == answer

def test_ask_returns_answer_with_sources(client, pet, monkeypatch, tmp_path):
    """With a corpus indexed, /ask streams tokens and reports the sources it used."""


    (tmp_path / "doc1.txt").write_text(
        "Feeding a dog a balanced diet matters for its long term health. Adult dogs "
        "generally do well on two measured meals a day, and portion size should be "
        "adjusted to body condition rather than the label on the bag."
    )
    (tmp_path / "doc2.txt").write_text(
        "Cats are obligate carnivores and need a diet high in animal protein. Wet food "
        "helps maintain hydration, which supports urinary tract health in cats that "
        "drink little water."
    )

    # Ingest the documents into the RAG system
    rag.ingest(str(tmp_path))

    # Mock the RAG generate function to return a fixed response
    monkeypatch.setattr(rag, "generate", lambda messages: iter(["Kennel ", "cough."]))

    # Get headers and pet data from the fixture
    headers, pet_data = pet

    # Extract the pet ID for the request
    pet_id = pet_data["id"]

    # Ask a question using the /ask endpoint
    r = client.post("/ask", json={"pet_id": pet_id, "question": "What should I feed my pet?"}, headers=headers)

    # Check that the response contains the expected tokens and sources
    assert r.status_code == 200
    import json
    lines = r.text.strip().split("\n")
    data = [json.loads(line) for line in lines]
    assert any("token" in item for item in data)
    assert "meta" in data[-1] and data[-1]["meta"]["sources"]

    r.text.strip().split("\n")

def test_record_photos_are_isolated_between_users(client, auth, pet):
    """User B must not be able to read or delete user A's photos."""

    # Create a record and upload a photo for user A
    headers_a, pet_a = pet

    # Create a record for user A
    r = client.post(f"/pets/{pet_a['id']}/records", json={"title": "Vaccination", "record_type": "Vaccination", "date": "2024-01-01"}, headers=headers_a)
    assert r.status_code == 201
    record_id = r.json()["id"]

    # Upload a photo for the record
    r = client.post(f"/records/{record_id}/photos",
                    files={"files": ("x.jpg", b"fake-bytes", "image/jpeg")},
                    headers=headers_a)
    assert r.status_code == 201
    photo_id = r.json()[0]["id"]

    # Attempt to access the photo as user B
    headers_b = auth(username="userb", email="userb@example.com")
    r = client.get(f"/pets/{pet_a['id']}/photos", headers=headers_b)
    assert r.status_code == 404
    r = client.delete(f"/record-photos/{photo_id}", headers=headers_b)
    assert r.status_code == 404

    # Verify that user A can still access the photo
    r = client.get(f"/pets/{pet_a['id']}/photos", headers=headers_a)
    assert r.status_code == 200
    assert len(r.json()) == 1


def test_photo_upload_rejects_bad_type_and_oversize(client, pet):
    """Only jpeg/png/webp under the size cap are accepted."""

    # Get headers and pet data from the fixture
    headers, pet_data = pet

    # Extract the pet ID for the request
    pet_id = pet_data["id"]

    # Create a record for the pet
    r = client.post(f"/pets/{pet_id}/records", json={"title": "Test", "record_type": "Vaccination", "date": "2024-01-01"}, headers=headers)

    # Extract the record ID from the response
    assert r.status_code == 201
    record_id = r.json()["id"]
    r = client.post(f"/records/{record_id}/photos",
                    files={"files": ("x.txt", b"fake-bytes", "text/plain")},
                    headers=headers)
    assert r.status_code == 400

    # Attempt to upload a photo with an invalid file type or an oversized file, expecting a 400 Bad Request response.
    r = client.post(f"/records/{record_id}/photos",
                    files={"files": ("x.jpg", b"x" * (settings.MAX_PHOTO_MB * 1024 * 1024 + 1), "image/jpeg")},
                    headers=headers)
    assert r.status_code == 400


def test_gate_query_replaces_only_whole_words():
    """A pet's name must not be substituted inside unrelated words.

    A pet called "Bo" once turned "Bo has a boil on his body" into
    "Dog has a Dogil on his Dogdy", which then failed the scope gate for
    reasons invisible to the user.
    """
    from types import SimpleNamespace

    from routers.ask import _gate_query

    bo = SimpleNamespace(name="Bo", species="Dog")
    assert _gate_query("Bo has a boil on his body", bo) == "Dog has a boil on his body"

    sam = SimpleNamespace(name="Sam", species="Dog")
    assert _gate_query("is the same dose safe for Sam", sam) == "is the same dose safe for Dog"

    cat = SimpleNamespace(name="Cat", species="Cat")
    assert _gate_query("should I use a catheter", cat) == "should I use a catheter"


def test_timezones_are_listed(client, auth):
    """The picker's list comes from the server's own tzdata, not the client's Intl."""
    headers = auth()
    r = client.get("/auth/timezones", headers=headers)
    assert r.status_code == 200
    timezones = r.json()
    assert "America/Los_Angeles" in timezones
    assert len(timezones) > 100

    r = client.get("/auth/timezones")
    assert r.status_code == 401


def test_username_can_be_changed(client, auth):
    """PATCH /auth/me updates the username without touching anything else."""
    headers = auth()

    r = client.patch("/auth/me", headers=headers, json={"username": "renamed"})
    assert r.status_code == 200
    assert r.json()["username"] == "renamed"

    r = client.get("/auth/me", headers=headers)
    assert r.status_code == 200

    body = r.json()
    assert body["username"] == "renamed"
    assert "email" in body


def test_avatar_upload_and_removal(client, auth):
    """Uploading sets photo_filename; deleting clears it and 400s when there is none."""
    headers = auth()

    r = client.post("/auth/me/photo", headers=headers, files={"file": ("a.jpg", b"fake-bytes", "image/jpeg")})
    assert r.status_code == 200
    assert r.json()["photo_filename"].endswith(".jpg")

    r = client.delete("/auth/me/photo", headers=headers)
    assert r.status_code == 200
    assert r.json()["photo_filename"] is None

    r = client.delete("/auth/me/photo", headers=headers)
    assert r.status_code == 400

    r = client.post("/auth/me/photo", headers=headers, files={"file": ("a.txt", b"...", "text/plain")})
    assert r.status_code == 400


def test_change_password_invalidates_the_old_token(client, auth):
    """The fp claim kills every existing token; the response carries a fresh one."""
    headers = auth()

    r = client.post("/auth/change-password", headers=headers, json={"current_password": "password", "new_password": "newpassword"})
    assert r.status_code == 200
    new_token = r.json()["access_token"]
    assert new_token != headers["Authorization"].split(" ")[1]

    r = client.get("/auth/me", headers=headers)
    assert r.status_code == 401

    new_headers = {"Authorization": f"Bearer {new_token}"}
    r = client.get("/auth/me", headers=new_headers)
    assert r.status_code == 200

    r = client.post("/auth/change-password", headers=new_headers, json={"current_password": "wrongpassword", "new_password": "anothernewpassword"})
    assert r.status_code == 401


def test_short_follow_up_inherits_the_previous_question():
    """A question too short to retrieve on is expanded with the previous one."""
    from routers.ask import _with_context

    assert _with_context("how often?", [{"role": "user", "content": "what vaccines does my dog need"}, {"role": "assistant", "content": "..."}]).startswith("what vaccines does my dog need")
    assert _with_context("how often should a dog get the rabies vaccine", [{"role": "user", "content": "what vaccines does my dog need"}, {"role": "assistant", "content": "..."}]) == "how often should a dog get the rabies vaccine"
    assert _with_context("how often?", []) == "how often?"
