import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import fr from "./locales/fr.json";
import es from "./locales/es.json";
import de from "./locales/de.json";
import ar from "./locales/ar.json";
import ru from "./locales/ru.json";
import zh from "./locales/zh.json";
import zhHant from "./locales/zh-Hant.json";

export const LANGUAGES = ["en", "fr", "es", "de", "ar", "ru", "zh", "zh-Hant"] as const;

// The only right-to-left language in the set. A Set so adding he or fa later is one entry.
const RTL_LANGUAGES = new Set<string>(["ar"]);

// Translation resources for i18next. Each language has its own JSON file with key-value pairs for translations.
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

i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  returnNull: false,
});

// Keeps the document in step with the active language: lang for screen readers and hyphenation,
// dir so the logical CSS properties from step 1a mirror the whole layout for Arabic.
// lang keeps the script, so zh-Hant gets the Traditional glyphs and fonts rather than the Simplified ones.
function applyDocumentLanguage(lng: string) {
  document.documentElement.lang = lng;
  document.documentElement.dir = RTL_LANGUAGES.has(lng.split("-")[0]) ? "rtl" : "ltr";
}

i18n.on("languageChanged", applyDocumentLanguage);
applyDocumentLanguage(i18n.language || "en");

export default i18n;