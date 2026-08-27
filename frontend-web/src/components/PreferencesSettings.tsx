import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { updateMe } from "../api/auth";
import { CURRENCIES, LANGUAGES, UNIT_SYSTEMS } from "../types";

const UNIT_LABELS: Record<string, string> = {
  metric: "Metric (kg, km)",
  imperial: "Imperial (lb, mi)",
};

const SELECT =
  "w-full rounded-lg bg-ink border border-border px-3 py-2.5 text-fg focus:border-primary focus:outline-none disabled:opacity-50";

export default function PreferencesSettings() {
  const { user, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(patch: Parameters<typeof updateMe>[0]) {
    setSaving(true);
    setError(null);
    try {
      await updateMe(patch);
      await refreshUser();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <section className="p-6 bg-surface border border-border rounded-xl shadow-soft mb-6">
      <h2 className="text-lg font-semibold mb-4">Units &amp; Language</h2>
      {error && <p className="text-danger text-sm mb-4">{error}</p>}

      <label className="block mb-4">
        <span className="block text-sm text-muted mb-1">Measurements</span>
        <select
          value={user.unit_system}
          disabled={saving}
          onChange={(e) => save({ unit_system: e.target.value })}
          className={SELECT}
        >
          {UNIT_SYSTEMS.map((unit) => (
            <option key={unit} value={unit}>{UNIT_LABELS[unit]}</option>
          ))}
        </select>
      </label>

      <label className="block mb-4">
        <span className="block text-sm text-muted mb-1">Currency</span>
        <select
          value={user.currency}
          disabled={saving}
          onChange={(e) => save({ currency: e.target.value })}
          className={SELECT}
        >
          {CURRENCIES.map((currency) => (
            <option key={currency.code} value={currency.code}>
              {currency.code} — {currency.name}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="block text-sm text-muted mb-1">Language</span>
        <select
          value={user.language}
          disabled={saving}
          onChange={(e) => save({ language: e.target.value })}
          className={SELECT}
        >
          {LANGUAGES.map((language) => (
            <option key={language.code} value={language.code}>{language.name}</option>
          ))}
        </select>
      </label>

      <p className="text-sm text-muted mt-3">
        Weights are always stored in kilograms — this only changes how they are shown and entered.
        Most of the app is still English while translations are in progress.
      </p>
    </section>
  );
}