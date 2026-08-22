// Formats a stored YYYY-MM-DD date for display.
//
// Parse with the explicit T00:00:00 suffix. `new Date("2026-08-31")` parses as UTC
// midnight, which renders as the PREVIOUS day in any negative-offset timezone —
// the off-by-one that has already hit this project in v2 and v3.

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString();
}