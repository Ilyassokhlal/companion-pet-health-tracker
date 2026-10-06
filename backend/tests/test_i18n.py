"""The server's own translations: emails, reminders and push notifications."""

import json

from utils.i18n import _DIR, SUPPORTED, t


def test_every_language_has_every_key():
    """Each catalog carries exactly the English keys, so no email falls back to English halfway through."""
    english = set(json.loads((_DIR / "en.json").read_text(encoding="utf-8")))
    for code in SUPPORTED:
        keys = set(json.loads((_DIR / f"{code}.json").read_text(encoding="utf-8")))
        assert keys == english, code


def test_traditional_chinese_is_its_own_catalog():
    """zh-Hant reads from its own file, while zh stays Simplified."""
    assert t("email.reset.subject", "zh-Hant") == "重設您的密碼"
    assert t("email.reset.subject", "zh") == "重置您的密码"
