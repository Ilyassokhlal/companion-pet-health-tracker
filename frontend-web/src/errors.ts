import i18n from "i18next";
import { ApiError } from "./api/client";

// Returns a human-readable error message for any error, prioritizing API errors with translations. If no translation is available, it falls back to the error's message or a generic message.
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const translated = i18n.t(`errors.${err.code}`, { ...err.params, defaultValue: "" });
    if (translated) return translated;
    return err.message || i18n.t("errors.generic");
  }
  if (err instanceof Error && err.message) return err.message;
  return i18n.t("errors.generic");
}