import type { TFunction } from "i18next";

// The species the pet form offers are stored in English and shown in the app's language. Anything else stays as stored.
export function speciesLabel(species: string, t: TFunction): string {
  if (species === "Dog") return t("petForm.dog");
  if (species === "Cat") return t("petForm.cat");
  return species;
}
