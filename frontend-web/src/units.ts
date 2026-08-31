// Weight is stored in kilograms everywhere. Imperial is applied only at the edges — at the input on the way in, at the label on the way out — so a stored value never depends on which unit the user happened to have selected when they typed it.

const KG_PER_LB = 0.45359237;

// The unit label for the user's setting.
export function weightUnit(unitSystem: string): string {
  return unitSystem === "imperial" ? "lb" : "kg";
}

// A stored kilogram value as the number the user should see, rounded to one decimal.
export function fromKg(kg: number, unitSystem: string): number {
  const value = unitSystem === "imperial" ? kg / KG_PER_LB : kg;
  return Math.round(value * 10) / 10;
}

// A number the user typed, converted to the kilograms that get stored.
export function toKg(value: number, unitSystem: string): number {
  return unitSystem === "imperial" ? value * KG_PER_LB : value;
}

// A stored kilogram value as a display string, with its unit.
export function formatWeight(kg: number, unitSystem: string): string {
  return `${fromKg(kg, unitSystem)} ${weightUnit(unitSystem)}`;
}

const KM_PER_MILE = 1.609344;

// The unit label for the user's distance setting.
export function distanceUnit(unitSystem: string): string {
  return unitSystem === "imperial" ? "mi" : "km";
}

// A stored kilometre value as the number the user should see, rounded to one decimal.
export function fromKm(km: number, unitSystem: string): number {
  const value = unitSystem === "imperial" ? km / KM_PER_MILE : km;
  return Math.round(value * 10) / 10;
}

// A number the user typed, converted to the kilometres that get stored.
export function toKm(value: number, unitSystem: string): number {
  return unitSystem === "imperial" ? value * KM_PER_MILE : value;
}

// A stored kilometre value as a display string, with its unit.
export function formatDistance(km: number, unitSystem: string): string {
  return `${fromKm(km, unitSystem)} ${distanceUnit(unitSystem)}`;
}

// Format a duration in minutes as a human-readable string. Examples: "45 min", "1 h 15 min".
export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

// Currency symbols for the codes offered in Settings. Written out rather than reached for through Intl.NumberFormat, because Hermes' Intl surface differs from the browser's and a wrong-looking price is exactly the kind of thing that only shows up once it is on the phone.
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$", EUR: "€", GBP: "£", CAD: "CA$", AUD: "A$", CHF: "CHF", JPY: "¥",
  CNY: "CN¥", INR: "₹", BRL: "R$", MXN: "MX$", ZAR: "R", MAD: "MAD", RUB: "₽",
};

// Currencies that are conventionally written without minor units (e.g., JPY has no cents).
const ZERO_DECIMAL = new Set(["JPY"]);

// Format a monetary amount with its currency symbol or code. Uses zero decimal places for currencies like JPY.
export function formatMoney(amount: number, currency: string): string {
  const value = amount.toFixed(ZERO_DECIMAL.has(currency) ? 0 : 2);
  const symbol = CURRENCY_SYMBOLS[currency];
  return symbol ? `${symbol}${value}` : `${value} ${currency}`;
}