"""The admin dashboard's read only role: it reads the stats views, and nothing else in the database."""

import importlib.util
from pathlib import Path

import psycopg
import pytest
from config import settings
from database import engine
from sqlalchemy import text
from sqlalchemy.engine import make_url
from utils.stats_access import sync_reader_role

# Roles belong to the whole database server, so the tests use their own and remove it afterwards
ROLE = "stats_reader_test"

_migration = Path(__file__).resolve().parents[1] / "alembic" / "versions" / "e4a1b8c35d72_add_stats_views.py"
_spec = importlib.util.spec_from_file_location("stats_views", _migration)
assert _spec and _spec.loader
views = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(views)


def _connect_as(password: str) -> psycopg.Connection:
    url = make_url(str(engine.url)).set(drivername="postgresql", username=ROLE, password=password)
    return psycopg.connect(url.render_as_string(hide_password=False))


@pytest.fixture
def stats_schema(client):
    """The stats views on the test database, as the migration makes them, removed again before the next test drops its tables."""
    with engine.begin() as connection:
        for statement in views.VIEWS.split(";"):
            if statement.strip():
                connection.execute(text(statement))
    try:
        yield
    finally:
        with engine.begin() as connection:
            connection.execute(text("DROP SCHEMA IF EXISTS stats CASCADE"))
            exists = connection.execute(text("SELECT 1 FROM pg_roles WHERE rolname = :r"), {"r": ROLE}).first()
            if exists:
                connection.execute(text(f"DROP OWNED BY {ROLE}"))
                connection.execute(text(f"DROP ROLE {ROLE}"))


def test_the_reader_sees_the_stats_views_and_nothing_else(client, auth, stats_schema):
    """It counts accounts through the views, while the app's own tables, chats included, are refused, and it can't write."""
    auth()
    assert sync_reader_role(engine, ROLE, "first-test-password")

    with _connect_as("first-test-password") as reader:
        assert reader.execute("SELECT count(*), min(plan) FROM stats.users").fetchone() == (1, "trial")
        for table in ("public.users", "public.chat_messages", "public.health_records"):
            with pytest.raises(psycopg.errors.InsufficientPrivilege):
                reader.execute(f"SELECT * FROM {table}")
            reader.rollback()
        with pytest.raises((psycopg.errors.ReadOnlySqlTransaction, psycopg.errors.InsufficientPrivilege)):
            reader.execute("DELETE FROM stats.users")


def test_a_new_password_replaces_the_old_one(client, stats_schema):
    """Changing GRAFANA_DB_PASSWORD and restarting is enough. Without a password nothing is set up."""
    assert sync_reader_role(engine, ROLE, "") is False
    assert sync_reader_role(engine, ROLE, "first-test-password")
    assert sync_reader_role(engine, ROLE, "second-test-password")

    with pytest.raises(psycopg.OperationalError):
        _connect_as("first-test-password").close()
    with _connect_as("second-test-password") as reader:
        assert reader.execute("SELECT count(*) FROM stats.users").fetchone() == (0,)


def test_the_reader_counts_days_in_the_owners_timezone(client, stats_schema, monkeypatch):
    """Its today is the owner's day, from STATS_TIMEZONE. A name Postgres wouldn't know falls back to UTC."""
    monkeypatch.setattr(settings, "STATS_TIMEZONE", "America/Los_Angeles")
    assert sync_reader_role(engine, ROLE, "tz-test-password")
    with _connect_as("tz-test-password") as reader:
        assert reader.execute("SHOW timezone").fetchone() == ("America/Los_Angeles",)

    monkeypatch.setattr(settings, "STATS_TIMEZONE", "Not/AZone")
    assert sync_reader_role(engine, ROLE, "tz-test-password")
    with _connect_as("tz-test-password") as reader:
        assert reader.execute("SHOW timezone").fetchone() == ("UTC",)
