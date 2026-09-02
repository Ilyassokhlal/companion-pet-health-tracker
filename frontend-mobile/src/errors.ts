import i18n from "i18next";
import { ApiError } from "./api/client";

// Returns a human-readable error message for any error thrown by the API client. A translation is attempted first, falling back to the server-provided message or a generic error message if necessary.
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const translated = i18n.t(`errors.${err.code}`, { ...err.params, defaultValue: "" });
    if (translated) return translated;
    return err.message || i18n.t("errors.generic");
  }
  if (err instanceof Error && err.message) return err.message;
  return i18n.t("errors.generic");
}