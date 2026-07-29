import logging
import os

from database import SessionLocal
from models.models import ActivityLog

# Setting up the activity logger
LOG_PATH = os.environ.get("ACTIVITY_LOG", "/logs/activity.log")
os.makedirs(os.path.dirname(LOG_PATH), exist_ok=True)

# Configuring the logger
_logger = logging.getLogger("activity")
if not _logger.handlers:
    _logger.setLevel(logging.INFO)
    _handler = logging.FileHandler(LOG_PATH)
    _handler.setFormatter(logging.Formatter("%(asctime)s | %(message)s"))
    _logger.addHandler(_handler)

# Utility function to log user activity
def log_activity(user_id: int, action: str, detail: str | None = None, pet_id: int | None = None) -> None:
    """Logging user activity"""
    db = SessionLocal()
    try:
        db.add(ActivityLog(user_id=user_id, action=action, detail=detail, pet_id=pet_id))
        db.commit()
        _logger.info(f"user={user_id} pet={pet_id} action={action} detail={detail or ''}")
    finally:
        db.close()