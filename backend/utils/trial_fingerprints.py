import hashlib
import hmac
from datetime import datetime, timedelta

from config import settings
from models.models import TrialFingerprint, User
from sqlalchemy.orm import Session
from utils.access import TRIAL, access_state, trial_days_left

# How long an email that had its free month is remembered after its account is deleted or moves to another address.
FINGERPRINT_DAYS = 365


def email_hash(email: str) -> str:
    """A keyed hash of the email, so the address itself is never stored. Matching ignores upper and lower case only.

    Keyed with SECRET_KEY: changing that key forgets every fingerprint, which only means those emails get a free month again."""
    return hmac.new(settings.SECRET_KEY.encode(), f"trial:{email.strip().lower()}".encode(), hashlib.sha256).hexdigest()


def remember_trial(db: Session, email: str, days_left: int, reason: str) -> None:
    """Record that this email has had its free month, with the trial days a returning account gets back. Replaces any earlier record for the same email."""
    digest = email_hash(email)
    row = db.query(TrialFingerprint).filter(TrialFingerprint.email_hash == digest).first() or TrialFingerprint(email_hash=digest)
    row.days_left = days_left
    row.reason = reason
    row.expires_at = datetime.now() + timedelta(days=FINGERPRINT_DAYS)
    db.add(row)


def claim_trial(db: Session, email: str) -> int | None:
    """At signup: the trial days an email that already had its free month gets back, or None for an email with no record. The record is used up."""
    row = (
        db.query(TrialFingerprint)
        .filter(TrialFingerprint.email_hash == email_hash(email), TrialFingerprint.expires_at > datetime.now())
        .first()
    )
    if row is None:
        return None
    db.delete(row)
    return row.days_left


def days_to_give_back(user: User) -> int:
    """The trial days a deleted account leaves for a returning signup. Only an account still in its free month has any: a paying, granted or locked one has none."""
    return trial_days_left(user) if access_state(user) == TRIAL else 0


def purge_expired_fingerprints(db: Session) -> int:
    """Daily: erase every fingerprint more than a year old. Returns how many were erased."""
    count = db.query(TrialFingerprint).filter(TrialFingerprint.expires_at <= datetime.now()).delete()
    db.commit()
    return count