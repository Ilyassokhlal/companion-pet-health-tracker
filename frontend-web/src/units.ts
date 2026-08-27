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