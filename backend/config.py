import os


# Configuration for the Companion API application
class Settings:
    """Application settings loaded from environment variables."""

    # Claude configuration
    MODEL_NAME: str = os.environ.get("MODEL_NAME", "claude-haiku-4-5")

    # ChromaDB configuration
    CHROMA_PATH: str = os.environ.get("CHROMA_PATH", "./chroma_db")
    COLLECTION_NAME: str = os.environ.get("COLLECTION_NAME", "documents")

    # RAG configuration
    MAX_RESULTS: int = int(os.environ.get("MAX_RESULTS", "5"))
    CONFIDENCE_THRESHOLD: float = float(os.environ.get("CONFIDENCE_THRESHOLD", "1.2"))

    # Application settings
    APP_NAME: str = "Companion API"
    DEBUG: bool = os.environ.get("DEBUG", "false").lower() == "true"
    DOCS_DIRECTORY: str = os.environ.get("DOCS_DIRECTORY", "./docs")
    SECRET_KEY: str = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-production")

    # CORS configuration
    CORS_ORIGINS: str = os.environ.get("CORS_ORIGINS", "http://localhost:5173")

    # Database
    DATABASE_URL: str = os.environ["DATABASE_URL"]

    # JWT
    ALGORITHM: str = os.environ.get("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

    # Frontend URL for email verification links
    FRONTEND_URL: str = os.environ.get("FRONTEND_URL", "http://localhost:5173")

    # Email settings
    REMINDER_LEAD_DAYS: int = int(os.environ.get("REMINDER_LEAD_DAYS", "7"))

    # Reminder scheduling settings
    REMINDER_HOUR: int = int(os.environ.get("REMINDER_HOUR", "6"))
    TIMEZONE: str = os.environ.get("TIMEZONE", "UTC")

    # Photo storage settings
    PHOTO_DIR: str = os.environ.get("PHOTO_DIR", "/data/photos")
    MAX_PHOTO_MB: int = int(os.environ.get("MAX_PHOTO_MB", "5"))

settings = Settings()

# Print configuration on startup (useful for debugging)
if settings.DEBUG:
    print("=== Configuration ===")
    print(f"  Model: {settings.MODEL_NAME}")
    print(f"  ChromaDB: {settings.CHROMA_PATH}")
    print(f"  Max Results: {settings.MAX_RESULTS}")
    print(f"  Threshold: {settings.CONFIDENCE_THRESHOLD}")
    print(f"  Debug: {settings.DEBUG}")

