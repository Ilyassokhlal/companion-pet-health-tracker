import { useTranslation } from "react-i18next";

import { setDeviceLanguage } from "../api/auth";
import { LANGUAGES } from "../types";

// A dropdown component for selecting the device's language. This affects the language seen by visitors and the default language for new accounts. Arabic will be mirrored correctly due to the logical end-4 positioning.
export default function LanguagePicker() {
  const { t, i18n } = useTranslation();

  return (
    <select
      value={i18n.language.split("-")[0]}
      aria-label={t("settings.preferences.language")}
      onChange={(e) => {
        setDeviceLanguage(e.target.value);
        i18n.changeLanguage(e.target.value);
      }}
      className="absolute top-4 end-4 rounded-lg border border-border bg-ink px-3 py-2 text-sm text-fg focus:border-primary focus:outline-none"
    >
      {LANGUAGES.map((language) => (
        <option key={language.code} value={language.code}>{language.name}</option>
      ))}
    </select>
  );
}