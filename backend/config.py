import os

# Configuration for the Companion API application
class Settings:
    """Application settings loaded from environment variables."""

    # Ollama configuration
    OLLAMA_URL: str = os.environ.get("OLLAMA_URL", "http://localhost:11434")
    MODEL_NAME: str = os.environ.get("MODEL_NAME", "llama3.2:1b")

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

    # Database
    DATABASE_URL: str = os.environ.get("DATABASE_URL", "sqlite:///./companion.db")

    # JWT
    ALGORITHM: str = os.environ.get("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

settings = Settings()

# Print configuration on startup (useful for debugging)
if settings.DEBUG:
    print("=== Configuration ===")
    print(f"  Ollama URL: {settings.OLLAMA_URL}")
    print(f"  Model: {settings.MODEL_NAME}")
    print(f"  ChromaDB: {settings.CHROMA_PATH}")
    print(f"  Max Results: {settings.MAX_RESULTS}")
    print(f"  Threshold: {settings.CONFIDENCE_THRESHOLD}")
    print(f"  Debug: {settings.DEBUG}")

