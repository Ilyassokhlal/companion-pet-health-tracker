from fastapi import FastAPI
from fastapi import Request
from fastapi.responses import JSONResponse

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from database import Base, engine
from models.models import User, Pet, HealthRecord  # noqa: F401 - registers tables on Base.metadata
from utils.limiter import limiter
from utils.exceptions import AppException
from routers import auth, pets, records, ask, messages

from contextlib import asynccontextmanager
import rag

# lifespan context manager to handle startup tasks
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Index the corpus on first boot if the collection is empty,"""
    try:
        if rag.collection.count() == 0:
            result = rag.ingest()
            print(f"Ingested {result['chunks']} chunks from {result['documents']} documents.")
    except Exception as e:
        print(f"Startup ingest error: {e}")
    yield


# Initializing the database
Base.metadata.create_all(bind=engine)

# Initializing the FastAPI app
app = FastAPI(
    title="Companion API",
    description="API for managing users, their pets, and their pets' health records",
    version="1.0.0",
    lifespan=lifespan
)

# Setting up rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    """Render any AppException subclass as JSON with its own status code."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}
    )

# Including routers for authentication, pets, and health records
app.include_router(auth.router)
app.include_router(pets.router)
app.include_router(records.router)
app.include_router(ask.router)
app.include_router(messages.router)

# Root endpoint for introduction and redirection to documentation
@app.get("/", include_in_schema=False)
def root():
    """Landing response for the API root."""
    return {"message": "Companion API is running. Visit /docs for the interactive documentation."}

# Health check endpoint
@app.get("/health", tags=["Health"])
def health():
    """Health check endpoint to verify that the API is running."""
    return {"status": "ok"}