"""Signup, login and the account's own settings."""


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


def test_avatar_upload_and_removal(client, auth, jpeg):
    """Uploading sets photo_filename; deleting clears it and 400s when there is none."""
    headers = auth()

    r = client.post("/auth/me/photo", headers=headers, files={"file": ("a.jpg", jpeg(), "image/jpeg")})
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
