import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";

import en from "./locales/en.json";
import fr from "./locales/fr.json";
import es from "./locales/es.json";
import de from "./locales/de.json";
import ar from "./locales/ar.json";
import ru from "./locales/ru.json";
import zh from "./locales/zh.json";
import zhHant from "./locales/zh-Hant.json";

export const LANGUAGES = ["en", "fr", "es", "de", "ar", "ru", "zh", "zh-Hant"] as const;
export type Language = (typeof LANGUAGES)[number];

// getLocales() returns the phone's ranked language list. languageCode is already the bare subtag ("fr", not "fr-CA"), so unlike the web there is nothing to split.
// Chinese also reads the script, then the language's region: Traditional for Hant, Taiwan, Hong Kong and Macau, Simplified for everything else.
export function detectLanguage(): string {
  const locales = getLocales();
  for (const locale of locales) {
    if (locale.languageCode === "zh") {
      if (locale.languageScriptCode) return locale.languageScriptCode === "Hant" ? "zh-Hant" : "zh";
      return ["TW", "HK", "MO"].includes(locale.languageRegionCode ?? "") ? "zh-Hant" : "zh";
    }
    if (LANGUAGES.includes(locale.languageCode as Language)) {
      return locale.languageCode as string;
    }
  }
  return "en";
}

const resources = {
  en: { translation: en },
  fr: { translation: fr },
  es: { translation: es },
  de: { translation: de },
  ar: { translation: ar },
  ru: { translation: ru },
  zh: { translation: zh },
  "zh-Hant": { translation: zhHant },
};

// Initialize i18n with the detected language and the defined resources.
i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;