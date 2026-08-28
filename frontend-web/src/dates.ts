import i18n from "i18next";

// Formats a stored YYYY-MM-DD date for display.
export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(dateLocale());
}

// The long form, for surfaces where the date is read rather than scanned.
export function formatDateLong(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(dateLocale(), {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// Dates follow the APP's language setting rather than the browser's to avoid inconsistencies.
export function dateLocale(): string | undefined {
  return i18n.language || undefined;
}