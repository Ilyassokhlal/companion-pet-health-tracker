import os
import tempfile
from pathlib import Path
import pytest

# these must be set BEFORE importing main/database/rag — config.py reads env at import
# time, and rag.py opens ChromaDB at import time
_TMP = tempfile.mkdtemp(prefix="companion_tests_")
def _test_database_url() -> str:
    """TEST_DATABASE_URL if set, else derive one from the project .env."""
    if "TEST_DATABASE_URL" in os.environ:
        return os.environ["TEST_DATABASE_URL"]

    env_path = Path(__file__).resolve().parents[2] / ".env"
    url = ""
    for line in env_path.read_text().splitlines():
        if line.startswith("DATABASE_URL="):
            url = line.split("=", 1)[1].strip()
            break
    url = url.replace("@db:", "@localhost:")
    if url.endswith("/companion"):
        url = url[:-len("/companion")] + "/companion_test"
    return url
# Set environment variables for testing
os.environ["DATABASE_URL"] = _test_database_url()
os.environ["CHROMA_PATH"] = f"{_TMP}/chroma"
os.environ["PHOTO_DIR"] = f"{_TMP}/photos"
os.environ["SECRET_KEY"] = "test-secret"
os.environ["ANTHROPIC_API_KEY"] = "test-key"
os.environ["RESEND_API_KEY"] = "test-key"
os.environ["MAIL_FROM"] = "Companion <noreply@mycompanion.pet>"
os.environ["FRONTEND_URL"] = "http://localhost:5173"


from fastapi.testclient import TestClient  # noqa: E402
import main  # noqa: E402
from database import Base, engine  # noqa: E402
from utils.limiter import limiter  # noqa: E402

limiter.enabled = False


# pytest fixtures
@pytest.fixture(autouse=True)
def no_email(monkeypatch):
    """Never call Resend during tests. Returns the list of sent messages for assertions."""
    sent = []

    def _fake_send(to, subject, html):
        sent.append({"to": to, "subject": subject, "html": html})
        return True

    monkeypatch.setattr("utils.mailer.send_email", _fake_send)
    return sent

# Create the database tables for testing
@pytest.fixture
def client():
    """Fresh database per test."""
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    return TestClient(main.app)


@pytest.fixture
def auth(client):
    """Factory: register a user, return their auth headers."""
    def _auth(username="testuser", email="testuser@example.com", password="password"):
        r = client.post("/auth/register", json={"username": username, "email": email, "password": password})
        r.raise_for_status()
        token = r.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}
    return _auth


@pytest.fixture
def pet(client, auth):
    """A registered user with one pet. Returns (headers, pet)."""
    headers = auth()
    r = client.post("/pets", json={"name": "Fluffy", "species": "cat"}, headers=headers)
    r.raise_for_status()
    return headers, r.json()