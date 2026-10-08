"""The owner's actions on accounts, run from the server command line (python -m admin). Every one is written to the action log."""

import hashlib
import hmac
from datetime import date, datetime, time, timedelta

from config import settings
from models.models import AdminAction, EmailBan, User
from sqlalchemy import func
from sqlalchemy.orm import Session
from utils.accounts import delete_user
from utils.billing import cancel_renewals
from utils.mailer import send_ban_email, send_grant_email


class AdminError(Exception):
    """An action that can't be done as asked. Nothing was changed."""


def ban_hash(email: str) -> str:
    """A keyed hash of a banned email, so the ban outlives a deleted account without keeping the address. Matching ignores upper and lower case only, like the trial fingerprints."""
    return hmac.new(settings.SECRET_KEY.encode(), f"ban:{email.strip().lower()}".encode(), hashlib.sha256).hexdigest()


def is_email_banned(db: Session, email: str) -> bool:
    """True while this email is banned, whether or not its account still exists."""
    return db.query(EmailBan).filter(EmailBan.email_hash == ban_hash(email)).first() is not None


def find_user(db: Session, email: str) -> User | None:
    """The account using this email, ignoring upper and lower case."""
    return db.query(User).filter(func.lower(User.email) == email.strip().lower()).first()


def _account(db: Session, email: str) -> User:
    user = find_user(db, email)
    if user is None:
        raise AdminError(f"No account uses {email}.")
    return user


def _log(db: Session, action: str, email: str, user: User | None, reason: str | None, detail: str | None = None) -> None:
    db.add(AdminAction(action=action, user_id=user.id if user else None, email=email, reason=reason, detail=detail))


def _renewals_to_cancel(user: User) -> list[str]:
    """Where to stop this account's renewals by hand when the ban could not."""
    places = []
    if user.stripe_customer_id:
        places.append(f"Stripe: cancel the subscription of customer {user.stripe_customer_id} in the Stripe dashboard.")
    if user.premium_source == "purchased":
        places.append(f"Google Play: cancel the subscription of RevenueCat customer {user.id}, or refund it in the Play Console.")
    return places


def ban(db: Session, email: str, reason: str | None = None) -> list[str]:
    """Suspend the account: no sign in, every live session ends, no reminders, and its email can't sign up again. Its data stays until the delete command.

    Renewals are stopped like an account deletion. If Stripe or RevenueCat can't be reached, the ban goes ahead anyway and the warnings say what to cancel by hand. Returns those warnings."""
    user = _account(db, email)
    if user.banned_at is not None:
        raise AdminError(f"{user.email} is already banned.")

    warnings = []
    detail = None
    if not cancel_renewals(user):
        detail = "renewal not stopped"
        warnings = ["The ban went ahead, but a renewal could not be stopped.", *_renewals_to_cancel(user)]
    user.banned_at = datetime.now()
    if not is_email_banned(db, user.email):
        db.add(EmailBan(email_hash=ban_hash(user.email)))
    _log(db, "ban", user.email, user, reason, detail)
    db.commit()

    # Notices only ever go to a verified address
    if user.email_verified and not send_ban_email(user.email, user.language):
        warnings.append("The suspension email could not be sent.")
    return warnings


def unban(db: Session, email: str, reason: str | None = None) -> None:
    """Lift a ban, including one whose account was deleted, so the email can sign up again. Renewals stopped by the ban stay stopped."""
    user = find_user(db, email)
    row = db.query(EmailBan).filter(EmailBan.email_hash == ban_hash(email)).first()
    if (user is None or user.banned_at is None) and row is None:
        raise AdminError(f"{email} is not banned.")
    if user is not None:
        user.banned_at = None
    if row is not None:
        db.delete(row)
    _log(db, "unban", user.email if user else email.strip(), user, reason)
    db.commit()


def grant(db: Session, email: str, until: date | None = None, reason: str | None = None) -> list[str]:
    """Give Companion Premium for life, or through the end of the given day. Returns warnings for the owner."""
    user = _account(db, email)
    if user.banned_at is not None:
        raise AdminError(f"{user.email} is banned. Unban it first.")
    if until is not None and until < date.today():
        raise AdminError(f"{until.isoformat()} has already passed.")

    warnings = []
    now = datetime.now()
    if user.premium_source == "purchased" and user.premium_renews is not False and user.premium_expires_at and user.premium_expires_at > now:
        warnings.append(f"{user.email} also has a purchase that keeps renewing. Cancel it in Stripe or Google Play if the grant replaces it.")
    user.premium_source = "granted"
    user.premium_expires_at = None if until is None else datetime.combine(until + timedelta(days=1), time.min)
    user.premium_renews = None
    # A new end date gets its own warnings before it
    user.lock_warning_sent = None
    _log(db, "grant", user.email, user, reason, "lifetime" if until is None else f"until {until.isoformat()}")
    db.commit()

    if user.email_verified and not send_grant_email(user.email, user.username, until.isoformat() if until else None, user.language):
        warnings.append("The Premium email could not be sent.")
    return warnings


def revoke(db: Session, email: str, reason: str | None = None) -> None:
    """Take back a grant. The account falls back to whatever is left of its free month, or locks. A store purchase can't be revoked from here."""
    user = _account(db, email)
    if user.premium_source == "purchased":
        raise AdminError(f"{user.email} bought Premium. Refund or cancel it in Stripe or Google Play instead.")
    if user.premium_source != "granted":
        raise AdminError(f"{user.email} has no granted Premium.")
    user.premium_source = None
    user.premium_expires_at = None
    user.premium_renews = None
    user.lock_warning_sent = None
    _log(db, "revoke", user.email, user, reason)
    db.commit()


def delete(db: Session, email: str, reason: str | None = None) -> None:
    """Permanently delete a banned account and everything it owns. Only banned accounts, so a mistyped email can never remove a normal user. The email stays banned and stays in the log."""
    user = _account(db, email)
    if user.banned_at is None:
        raise AdminError(f"{user.email} is not banned. Ban it first, then delete it.")
    _log(db, "delete", user.email, user, reason)
    # Written before the account goes, so the database clears its account number and the entry keeps the email
    db.flush()
    if not delete_user(db, user):
        db.rollback()
        raise AdminError("A renewal could not be stopped, so nothing was deleted. Try again in a few minutes.")


def recent_actions(db: Session, email: str | None = None, limit: int = 50) -> list[AdminAction]:
    """The latest actions, newest first, for one email or for everyone."""
    query = db.query(AdminAction)
    if email:
        query = query.filter(func.lower(AdminAction.email) == email.strip().lower())
    return query.order_by(AdminAction.created_at.desc(), AdminAction.id.desc()).limit(limit).all()
