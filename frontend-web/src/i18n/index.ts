import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import fr from "./locales/fr.json";
import es from "./locales/es.json";
import de from "./locales/de.json";
import ar from "./locales/ar.json";
import ru from "./locales/ru.json";
import zh from "./locales/zh.json";

export const LANGUAGES = ["en", "fr", "es", "de", "ar", "ru", "zh"] as const;
export type Language = (typeof LANGUAGES)[number];

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
function applyDocumentLanguage(lng: string) {
  const base = lng.split("-")[0];
  document.documentElement.lang = base;
  document.documentElement.dir = RTL_LANGUAGES.has(base) ? "rtl" : "ltr";
}

i18n.on("languageChanged", applyDocumentLanguage);
applyDocumentLanguage(i18n.language || "en");

export default i18n;