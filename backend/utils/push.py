import logging

import httpx
from models.models import DeviceToken
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

# Expo accepts at most 100 messages per request.
BATCH_SIZE = 100


def send_push(tokens: list[str], title: str, body: str) -> list[str]:
    """Send one notification to many tokens. Returns the tokens Expo reported as dead.

    Mirrors send_email in never raising — a push failure must not take down the
    reminder run that triggered it.
    """
    messages = [{"to": t, "title": title, "body": body, "sound": "default"} for t in tokens]
    dead: list[str] = []
    for i in range(0, len(messages), BATCH_SIZE):
        chunk = messages[i:i + BATCH_SIZE]
        try:
            r = httpx.post(EXPO_PUSH_URL, json=chunk, timeout=15)
            r.raise_for_status()
            for msg, result in zip(chunk, r.json().get("data", []), strict=False):
                if result.get("status") == "error":
                    logger.error(f"Push error for {msg['to']}: {result}")
                    if result.get("details", {}).get("error") == "DeviceNotRegistered":
                        dead.append(msg["to"])
        except Exception as e:
            logger.error(f"Error sending push batch: {e}")
    return dead


def prune_tokens(db: Session, tokens: list[str]) -> None:
    """Delete tokens Expo reported as DeviceNotRegistered."""
    if not tokens:
        return
    db.query(DeviceToken).filter(DeviceToken.token.in_(tokens)).delete(synchronize_session=False)
    db.commit()
