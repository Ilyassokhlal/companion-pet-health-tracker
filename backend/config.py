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
    CONFIDENCE_THRESHOLD: float = float(os.environ.get("CONFIDENCE_THRESHOLD", "0.91"))

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
    # The owner's own timezone, where each day of the admin dashboard's activity counts starts and ends. Falls back to TIMEZONE.
    STATS_TIMEZONE: str = os.environ.get("STATS_TIMEZONE") or os.environ.get("TIMEZONE", "UTC")
    # DB-IP's free country database, baked into the backend image at build time. Without it no country is recorded.
    COUNTRY_DB: str = os.environ.get("COUNTRY_DB", "/opt/dbip/country.mmdb")

    # Photo storage settings
    PHOTO_DIR: str = os.environ.get("PHOTO_DIR", "/data/photos")
    MAX_PHOTO_MB: int = int(os.environ.get("MAX_PHOTO_MB", "20"))

    # Premium billing. RevenueCat is the source of truth for paid status: it calls the webhook, and the backend reads the account's entitlement back from its API.
    REVENUECAT_SECRET_KEY: str = os.environ.get("REVENUECAT_SECRET_KEY", "")

    # The exact Authorization header value set on the webhook in RevenueCat's dashboard. Empty rejects every webhook call.
    REVENUECAT_WEBHOOK_AUTH: str = os.environ.get("REVENUECAT_WEBHOOK_AUTH", "")
    REVENUECAT_ENTITLEMENT: str = os.environ.get("REVENUECAT_ENTITLEMENT", "companion_premium")

    # RevenueCat's public API key for its Stripe app, used to report each web purchase.
    REVENUECAT_STRIPE_PUBLIC_KEY: str = os.environ.get("REVENUECAT_STRIPE_PUBLIC_KEY", "")

    # Web payments go through Stripe's hosted checkout. The two price IDs are the monthly and yearly Companion Premium prices.
    STRIPE_SECRET_KEY: str = os.environ.get("STRIPE_SECRET_KEY", "")
    STRIPE_PRICE_MONTHLY: str = os.environ.get("STRIPE_PRICE_MONTHLY", "")
    STRIPE_PRICE_YEARLY: str = os.environ.get("STRIPE_PRICE_YEARLY", "")

    # Signing secret of the webhook endpoint created in Stripe for /billing/stripe. Empty rejects every Stripe webhook call.
    STRIPE_WEBHOOK_SECRET: str = os.environ.get("STRIPE_WEBHOOK_SECRET", "")

settings = Settings()

# Print configuration on startup (useful for debugging)
if settings.DEBUG:
    print("=== Configuration ===")
    print(f"  Model: {settings.MODEL_NAME}")
    print(f"  ChromaDB: {settings.CHROMA_PATH}")
    print(f"  Max Results: {settings.MAX_RESULTS}")
    print(f"  Threshold: {settings.CONFIDENCE_THRESHOLD}")
    print(f"  Debug: {settings.DEBUG}")

