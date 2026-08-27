import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { usePets } from "../context/PetContext";
import { updateMe } from "../api/auth";
import { updatePet } from "../api/pets";
import { WEIGHT_FREQUENCIES } from "../types";
import type { WeightFrequency } from "../types";

const FREQUENCY_LABELS: Record<WeightFrequency, string> = {
  weekly: "Every week",
  biweekly: "Every two weeks",
  monthly: "Every month",
};

export default function WeightSettings() {
  const { user, refreshUser } = useAuth();
  const { pets, refresh } = usePets();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to save changes and refresh the user and pet data. It handles setting the saving state and error messages.
  async function save(action: () => Promise<unknown>) {
    setSaving(true);
    setError(null);
    try {
      await action();
      await refreshUser();
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <section className="p-6 bg-surface border border-border rounded-xl shadow-soft mb-6">
      <h2 className="text-lg font-semibold mb-4">Weight tracking</h2>
      {error && <p className="text-danger text-sm mb-4">{error}</p>}

      <label className="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          checked={user.weight_tracking_enabled}
          disabled={saving}
          onChange={() => save(() => updateMe({ weight_tracking_enabled: !user.weight_tracking_enabled }))}
          className="accent-primary"
        />
        <span>Track my pets' weight</span>
      </label>

      {!user.weight_tracking_enabled && (
        <p className="text-sm text-muted">Turn this on to schedule weigh-ins for individual pets.</p>
      )}

      {user.weight_tracking_enabled && pets.length === 0 && (
        <p className="text-sm text-muted">Add a pet to start tracking.</p>
      )}

      {user.weight_tracking_enabled && pets.map((pet) => (
        <div key={pet.id} className="flex flex-wrap items-center justify-between gap-3 py-2 border-t border-border">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={pet.weight_tracking_enabled}
              disabled={saving}
              onChange={() => save(() => updatePet(pet.id, { weight_tracking_enabled: !pet.weight_tracking_enabled }))}
              className="accent-primary"
            />
            <span>{pet.name}</span>
          </label>
          <select
            value={pet.weight_frequency}
            onChange={(e) => save(() => updatePet(pet.id, { weight_frequency: e.target.value as WeightFrequency }))}
            disabled={saving || !pet.weight_tracking_enabled}
            className="rounded-lg bg-ink border border-border px-3 py-1.5 text-sm text-fg focus:border-primary focus:outline-none disabled:opacity-50"
          >
            {WEIGHT_FREQUENCIES.map((f) => (
              <option key={f} value={f}>{FREQUENCY_LABELS[f]}</option>
            ))}
          </select>
        </div>
      ))}
    </section>
  );
}