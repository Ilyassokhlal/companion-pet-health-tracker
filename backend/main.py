from datetime import date

from fastapi import FastAPI
from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from utils.limiter import limiter
from utils.exceptions import AppException
from utils.reminders import send_due_reminders, send_feeding_reminders
from routers import auth, pets, records, ask, messages, devices, events, walks, feedings

from contextlib import asynccontextmanager
from config import settings
import rag

from apscheduler.schedulers.background import BackgroundScheduler
from database import SessionLocal


import os

# Scheduler for sending reminders
def _run_reminders():
    """Entry point for the scheduled job — opens its own session."""
    db = SessionLocal()
    try:
        today = date.today()
        emails_sent = send_due_reminders(db, today)
        if emails_sent > 0:
            print(f"Sent {emails_sent} reminder emails.")
    except Exception as e:
        print(f"Error sending reminders: {e}")
    finally:
        db.close()

# Scheduler entry point for feeding reminders
def _run_feeding_reminders():
    with SessionLocal() as db:
        send_feeding_reminders(db)

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
    scheduler = BackgroundScheduler(timezone=settings.TIMEZONE)
    scheduler.add_job(_run_reminders, "cron", minute=0, id="hourly_reminders")
    scheduler.add_job(_run_feeding_reminders, "cron", minute="0,15,30,45", id="feeding_reminders")
    scheduler.start()
    yield
    scheduler.shutdown()

# Initializing the FastAPI app
app = FastAPI(
    title="Companion API",
    description="API for managing users, their pets, and their pets' health records",
    version="2.0.0",
    lifespan=lifespan
)

# Allow the React dev server (and later the deployed frontends) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",")],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setting up the directory for storing pet photos and mounting it as a static files endpoint
os.makedirs(settings.PHOTO_DIR, exist_ok=True)
app.mount("/photos", StaticFiles(directory=settings.PHOTO_DIR), name="photos")

# Setting up rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
@app.exception_handler(AppException)
async def app_exception_handler(request: Request, exc: AppException):
    """Render any AppException subclass as JSON with its own status code."""
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail, "code": exc.code, "params": exc.params}
    )

# Including routers for authentication, pets, and health records
app.include_router(auth.router)
app.include_router(pets.router)
app.include_router(records.router)
app.include_router(ask.router)
app.include_router(messages.router)
app.include_router(devices.router)
app.include_router(events.router)
app.include_router(walks.router)
app.include_router(feedings.router)

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