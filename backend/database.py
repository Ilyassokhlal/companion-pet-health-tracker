from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from config import settings

# Database setup
class Base(DeclarativeBase):
    """Base class for SQLAlchemy models."""
    pass

# Connecting the database engine using the URL from settings. For SQLite, we disable the same-thread check.
engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False} if "sqlite" in settings.DATABASE_URL else {})

# Creating a configured "Session" class that will be used to create session objects for interacting with the database.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# Making sure that SQLite enforces foreign key constraints.
@event.listens_for(engine, "connect")
def _set_sqlite_pragma(dbapi_connection, connection_record):
    """Set SQLite PRAGMA settings for foreign key support."""
    if "sqlite" in settings.DATABASE_URL:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


# Dependency to get the database session.
def get_db():
    """Yield a database session and ensure it is closed after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()