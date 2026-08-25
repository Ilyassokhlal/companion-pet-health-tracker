import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";

export const LANGUAGES = ["en", "fr", "es", "de", "ar", "ru", "zh"] as const;
export type Language = (typeof LANGUAGES)[number];

// Translation resources for i18next. Each language has its own JSON file with key-value pairs for translations.
const resources = {
  en: { translation: en },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  returnNull: false,
});

export default i18n;