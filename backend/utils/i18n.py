import json
from pathlib import Path

# Internationalization utility for loading and retrieving translated strings. The translations are stored in JSON files under the i18n directory.
_DIR = Path(__file__).resolve().parent.parent / "i18n"

SUPPORTED = ("en", "fr", "es", "de", "ar", "ru", "zh")
DEFAULT = "en"


def _load() -> dict[str, dict[str, str]]:
    """Load all translation catalogs from the i18n directory."""
    catalogs: dict[str, dict[str, str]] = {}
    for code in SUPPORTED:
        path = _DIR / f"{code}.json"
        catalogs[code] = json.loads(path.read_text(encoding="utf-8")) if path.exists() else {}
    return catalogs


_CATALOGS = _load()


def t(key: str, lang: str | None = None, **params: object) -> str:
    """Retrieve a translated string for the given key and language, with optional parameter substitution.

    Substitution is a plain replace rather than str.format because these strings are rendered by
    the 6am reminder job with nobody watching: a stray brace in a translation would raise inside
    format() and take the whole digest down, while replace() cannot fail.
    """
    code = lang if lang in _CATALOGS else DEFAULT
    value = _CATALOGS[code].get(key) or _CATALOGS[DEFAULT].get(key) or key
    for name, replacement in params.items():
        value = value.replace("{" + name + "}", str(replacement))
    return value