"""The read only database role the admin dashboard (Grafana) signs in with. It can read the stats views and nothing else."""

import logging

from config import settings
from psycopg import sql
from sqlalchemy import Engine

logger = logging.getLogger(__name__)

READER = "grafana_reader"


def sync_reader_role(engine: Engine, role: str = READER, password: str | None = None) -> bool:
    """Create the role, or bring its password in step with GRAFANA_DB_PASSWORD, and give it the stats views only.

    Run at every start, so changing the password in .env and restarting is enough. Without a password nothing is done
    and Grafana can't sign in. Returns True when the role was set up."""
    password = settings.GRAFANA_DB_PASSWORD if password is None else password
    if not password:
        logger.info("GRAFANA_DB_PASSWORD is not set, so the dashboard's read only role is left alone")
        return False
    name = sql.Identifier(role)
    statements = [
        sql.SQL(
            "DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = {}) THEN CREATE ROLE {} LOGIN; END IF; END $$"
        ).format(sql.Literal(role), name),
        sql.SQL("ALTER ROLE {} WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD {}").format(name, sql.Literal(password)),
        # Read only even if a grant slips through, and no query can hold the database for long
        sql.SQL("ALTER ROLE {} SET default_transaction_read_only = on").format(name),
        sql.SQL("ALTER ROLE {} SET statement_timeout = '30s'").format(name),
        sql.SQL("GRANT USAGE ON SCHEMA stats TO {}").format(name),
        sql.SQL("GRANT SELECT ON ALL TABLES IN SCHEMA stats TO {}").format(name),
        sql.SQL("ALTER DEFAULT PRIVILEGES IN SCHEMA stats GRANT SELECT ON TABLES TO {}").format(name),
    ]
    with engine.connect() as connection:
        raw = connection.connection.driver_connection
        with raw.cursor() as cursor:
            for statement in statements:
                cursor.execute(statement)
        raw.commit()
    return True
