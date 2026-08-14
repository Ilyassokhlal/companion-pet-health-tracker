from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

from config import settings

# Database setup
class Base(DeclarativeBase):
    """Base class for SQLAlchemy models."""
    pass

# Connecting the database engine using the URL from settings.
engine = create_engine(settings.DATABASE_URL)

# Creating a configured "Session" class that will be used to create session objects for interacting with the database.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Dependency to get the database session.
def get_db():
    """Yield a database session and ensure it is closed after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()