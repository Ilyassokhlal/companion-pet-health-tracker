import os
import tempfile
import pytest

# these must be set BEFORE importing main/database/rag — config.py reads env at import
# time, and rag.py opens ChromaDB at import time
_TMP = tempfile.mkdtemp(prefix="companion_tests_")
# Set environment variables for testing
os.environ["DATABASE_URL"] = f"sqlite:///{_TMP}/test.db"
os.environ["CHROMA_PATH"] = f"{_TMP}/chroma"
os.environ["SECRET_KEY"] = "test-secret"


from fastapi.testclient import TestClient  # noqa: E402
import main  # noqa: E402
from database import Base, engine  # noqa: E402
from utils.limiter import limiter  # noqa: E402

limiter.enabled = False

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