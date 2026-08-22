import os
import logging
from html import escape

import resend

from config import settings

resend.api_key = os.environ["RESEND_API_KEY"]

FROM_ADDRESS = os.environ["MAIL_FROM"]

logger = logging.getLogger(__name__)

# An email is read off-network, so the logo needs a publicly reachable URL.
# FRONTEND_URL is localhost in dev, which no mail client can fetch.
LOGO_URL = os.environ.get("EMAIL_LOGO_URL", f"{settings.FRONTEND_URL}/icon.png")

# Brand palette, mirrored from frontend-web/src/index.css @theme.
INK = "#0b0a0f"
SURFACE = "#16131f"
BORDER = "#2a2340"
PRIMARY = "#7c3aed"
FG = "#ece9f5"
MUTED = "#9c93b8"

FONT = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"


def _button(label: str, url: str) -> str:
    """A centred call-to-action button, built from a table because Outlook drops padding on <a>."""
    return f"""
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px auto;">
      <tr>
        <td align="center" bgcolor="{PRIMARY}" style="border-radius:8px;">
          <a href="{url}" style="display:inline-block;padding:13px 30px;font-family:{FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">{label}</a>
        </td>
      </tr>
    </table>
    """


def _layout(title: str, body: str) -> str:
    """Wrap body content in the shared shell: logo header, card, signature."""
    return f"""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>{title}</title>
</head>
<body style="margin:0;padding:0;background-color:{INK};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:{INK};padding:32px 12px;">
  <tr>
    <td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background-color:{SURFACE};border:1px solid {BORDER};border-radius:14px;">
        <tr>
          <td align="center" style="padding:32px 32px 8px 32px;">
            <img src="{LOGO_URL}" width="52" height="52" alt="Companion" style="display:block;border:0;border-radius:12px;font-family:{FONT};font-size:19px;font-weight:700;color:{FG};">
            <div style="font-family:{FONT};font-size:19px;font-weight:700;color:{FG};padding-top:12px;">Companion</div>
          </td>
        </tr>
        <tr>
          <td style="padding:12px 32px 20px 32px;font-family:{FONT};font-size:15px;line-height:1.65;color:{FG};">
            {body}
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px 32px 32px;border-top:1px solid {BORDER};font-family:{FONT};font-size:13px;line-height:1.6;color:{MUTED};">
            — The Companion team<br>
            <a href="{settings.FRONTEND_URL}" style="color:{PRIMARY};text-decoration:none;">mycompanion.pet</a>
          </td>
        </tr>
      </table>
      <div style="font-family:{FONT};font-size:12px;color:{MUTED};padding-top:18px;">
        You're receiving this because you have a Companion account.
      </div>
    </td>
  </tr>
</table>
</body>
</html>"""

def send_verification_email(to: str, token: str) -> None:
    """Email a verification link."""
    link = f"{settings.FRONTEND_URL}/verify?token={token}"
    subject = "Verify your email"
    body = f"""
    <p style="margin:0 0 14px 0;">Welcome to Companion.</p>
    <p style="margin:0 0 14px 0;">Confirm your email address to finish setting up your account.</p>
    {_button('Verify email', link)}
    <p style="margin:0;color:{MUTED};font-size:13px;">This link expires in 24 hours. If you didn't create a Companion account, you can ignore this email.</p>
    """
    send_email(to, subject, _layout(subject, body))

def send_reset_email(to: str, token: str) -> None:
    """Email a password reset link."""
    link = f"{settings.FRONTEND_URL}/reset?token={token}"
    subject = "Reset your password"
    body = f"""
    <p style="margin:0 0 14px 0;">We received a request to reset your Companion password.</p>
    {_button('Reset password', link)}
    <p style="margin:0;color:{MUTED};font-size:13px;">This link expires in 15 minutes. If you didn't request a reset, no action is needed — your password hasn't changed.</p>
    """
    send_email(to, subject, _layout(subject, body))

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
    safe_name = escape(username)
    rows = "".join(f'<li style="margin:0 0 8px 0;">{escape(item)}</li>' for item in items)
    body = f"""
    <p style="margin:0 0 14px 0;">Hello {safe_name},</p>
    <p style="margin:0 0 14px 0;">These health updates are coming due:</p>
    <ul style="margin:0 0 20px 0;padding-left:20px;">{rows}</ul>
    <p style="margin:0 0 14px 0;">Please take care of these at your earliest convenience.</p>
    {_button('Open Companion', f'{settings.FRONTEND_URL}/dashboard')}
    <p style="margin:0;color:{MUTED};font-size:13px;">Manage your reminders in <a href="{settings.FRONTEND_URL}/settings" style="color:{PRIMARY};text-decoration:none;">Settings</a>.</p>
    """
    return send_email(to, subject, _layout(subject, body))

def send_email_changed_email(to: str, new_email: str) -> bool:
    """Warn the PREVIOUS address that the account's email was changed.

    Deliberately sent to the old address: if someone changes the email on a
    hijacked session, this is the only message that still reaches the real owner.
    """
    subject = "A change to your Companion email was requested"
    body = f"""
    <p style="margin:0 0 14px 0;">Someone requested to change the email address on your Companion account to <strong>{escape(new_email)}</strong>. The change won't take effect until that address is verified.</p>
    <p style="margin:0 0 14px 0;">If you made this change, no action is needed — this notice is for your records.</p>
    <p style="margin:0 0 14px 0;">If you did not, someone else may have access to your account. Reset your password now to lock it back down.</p>
    {_button('Reset your password', f'{settings.FRONTEND_URL}/forgot')}
    """
    return send_email(to, subject, _layout(subject, body))


def send_password_changed_email(to: str) -> bool:
    """Confirm to the account holder that their password was changed."""
    subject = "Your Companion password was changed"
    body = f"""
    <p style="margin:0 0 14px 0;">Your Companion password was just changed.</p>
    <p style="margin:0 0 14px 0;">If this was you, no action is needed.</p>
    <p style="margin:0 0 14px 0;">If it wasn't, request a reset immediately — that will invalidate the current password.</p>
    {_button('Reset your password', f'{settings.FRONTEND_URL}/forgot')}
    """
    return send_email(to, subject, _layout(subject, body))