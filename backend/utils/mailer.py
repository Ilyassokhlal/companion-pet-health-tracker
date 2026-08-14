import os
import logging

import resend

from config import settings

resend.api_key = os.environ["RESEND_API_KEY"]

FROM_ADDRESS = os.environ["MAIL_FROM"]

logger = logging.getLogger(__name__)

def send_verification_email(to: str, token: str) -> None:
    """Email a verification link."""
    link = f"{settings.FRONTEND_URL}/verify?token={token}"
    subject = "Verify your email"
    html = f"""
    <p>Hello,</p>
    <p>Please verify your email by clicking the link below:</p>
    <p><a href="{link}">Verify Email</a></p>
    <p>This link will expire in 24 hours.</p>
    """
    send_email(to, subject, html)

def send_reset_email(to: str, token: str) -> None:
    """Email a password reset link."""
    link = f"{settings.FRONTEND_URL}/reset?token={token}"
    subject = "Reset your password"
    html = f"""
    <p>Hello,</p>
    <p>You requested a password reset. Click the link below to reset your password:</p>
    <p><a href="{link}">Reset Password</a></p>
    <p>This link will expire in 15 minutes. If you did not request a password reset, please ignore this email.</p>
    """
    send_email(to, subject, html)

def send_email(to: str, subject: str, html: str) -> bool:
    """... returns True if it was accepted by Resend, False on failure."""
    try:
        params = {
            "from": FROM_ADDRESS,
            "to": [to],
            "subject": subject,
            "html": html,
        }
        resend.Emails.send(params)
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to}: {e}")
        return False

def send_reminder_email(to: str, username: str, items: list[str]) -> bool:
    """Email a digest of records coming due. Returns True if it sent."""
    subject = "Upcoming pet care"
    html = f"""
    <p>Hello {username},</p>
    <p>The following health updates for your companion are due soon:</p>
    <ul>
    {''.join(f'<li>{item}</li>' for item in items)}
    </ul>
    <p>Please make sure to take care of them.</p>
    <p>Thank you for using Companion!</p>
    <p>Manage your reminders <a href="{settings.FRONTEND_URL}/settings">here</a>.</p>
    """
    return send_email(to, subject, html)