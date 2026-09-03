import logging
import os
from html import escape

import resend
from config import settings
from utils.i18n import t

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


def _layout(title: str, body: str, lang: str | None = None) -> str:
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
            {t("email.signature", lang)}<br>
            <a href="{settings.FRONTEND_URL}" style="color:{PRIMARY};text-decoration:none;">mycompanion.pet</a>
          </td>
        </tr>
      </table>
      <div style="font-family:{FONT};font-size:12px;color:{MUTED};padding-top:18px;">
        {t("email.footer", lang)}
      </div>
    </td>
  </tr>
</table>
</body>
</html>"""

def send_verification_email(to: str, token: str, lang: str | None = None) -> None:
    """Email a verification link."""
    link = f"{settings.FRONTEND_URL}/verify?token={token}"
    subject = t("email.verify.subject", lang)
    body = f"""
    <p style="margin:0 0 14px 0;">{t("email.verify.line1", lang)}</p>
    <p style="margin:0 0 14px 0;">{t("email.verify.line2", lang)}</p>
    {_button(t("email.verify.button", lang), link)}
    <p style="margin:0;color:{MUTED};font-size:13px;">{t("email.verify.note", lang)}</p>
    """
    send_email(to, subject, _layout(subject, body, lang))

def send_reset_email(to: str, token: str, lang: str | None = None) -> None:
    """Email a password reset link."""
    link = f"{settings.FRONTEND_URL}/reset?token={token}"
    subject = t("email.reset.subject", lang)
    body = f"""
    <p style="margin:0 0 14px 0;">{t("email.reset.line1", lang)}</p>
    {_button(t("email.reset.button", lang), link)}
    <p style="margin:0;color:{MUTED};font-size:13px;">{t("email.reset.note", lang)}</p>
    """
    send_email(to, subject, _layout(subject, body, lang))

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

def send_reminder_email(to: str, username: str, items: list[str], lang: str | None = None) -> bool:
    """Email a digest of records coming due. Returns True if it sent."""
    subject = t("email.reminder.subject", lang)
    safe_name = escape(username)
    rows = "".join(f'<li style="margin:0 0 8px 0;">{escape(item)}</li>' for item in items)
    settings_link = (
        f'<a href="{settings.FRONTEND_URL}/settings" style="color:{PRIMARY};text-decoration:none;">'
        f'{t("email.reminder.manageLink", lang)}</a>'
    )
    body = f"""
    <p style="margin:0 0 14px 0;">{t("email.reminder.greeting", lang, name=safe_name)}</p>
    <p style="margin:0 0 14px 0;">{t("email.reminder.intro", lang)}</p>
    <ul style="margin:0 0 20px 0;padding-left:20px;">{rows}</ul>
    <p style="margin:0 0 14px 0;">{t("email.reminder.outro", lang)}</p>
    {_button(t("email.reminder.button", lang), f'{settings.FRONTEND_URL}/dashboard')}
    <p style="margin:0;color:{MUTED};font-size:13px;">{t("email.reminder.manage", lang, link=settings_link)}</p>
    """
    return send_email(to, subject, _layout(subject, body, lang))

def send_email_changed_email(to: str, new_email: str, lang: str | None = None) -> bool:
    """Warn the PREVIOUS address that the account's email was changed.

    Deliberately sent to the old address: if someone changes the email on a
    hijacked session, this is the only message that still reaches the real owner.
    """
    subject = t("email.emailChanged.subject", lang)
    highlighted = f"<strong>{escape(new_email)}</strong>"
    body = f"""
    <p style="margin:0 0 14px 0;">{t("email.emailChanged.line1", lang, email=highlighted)}</p>
    <p style="margin:0 0 14px 0;">{t("email.emailChanged.line2", lang)}</p>
    <p style="margin:0 0 14px 0;">{t("email.emailChanged.line3", lang)}</p>
    {_button(t("email.emailChanged.button", lang), f'{settings.FRONTEND_URL}/forgot')}
    """
    return send_email(to, subject, _layout(subject, body, lang))


def send_password_changed_email(to: str, lang: str | None = None) -> bool:
    """Confirm to the account holder that their password was changed."""
    subject = t("email.passwordChanged.subject", lang)
    body = f"""
    <p style="margin:0 0 14px 0;">{t("email.passwordChanged.line1", lang)}</p>
    <p style="margin:0 0 14px 0;">{t("email.passwordChanged.line2", lang)}</p>
    <p style="margin:0 0 14px 0;">{t("email.passwordChanged.line3", lang)}</p>
    {_button(t("email.emailChanged.button", lang), f'{settings.FRONTEND_URL}/forgot')}
    """
    return send_email(to, subject, _layout(subject, body, lang))