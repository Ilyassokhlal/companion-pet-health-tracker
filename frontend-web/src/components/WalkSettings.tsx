import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { usePets } from "../context/PetContext";
import { updateMe } from "../api/auth";
import { updatePet } from "../api/pets";
import { errorMessage } from "../errors";

export default function WalkSettings() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const { pets, refresh } = usePets();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Save changes by executing the provided action, handle errors, and refresh user and pet data.
  async function save(action: () => Promise<unknown>) {
    setSaving(true);
    setError(null);
    try {
      await action();
      await refreshUser();
      await refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <section className="p-6 bg-surface border border-border rounded-xl shadow-soft mb-6">
      <h2 className="text-lg font-semibold mb-4">{t("trackingSettings.walks.title")}</h2>
      {error && <p className="text-danger text-sm mb-4">{error}</p>}

      <label className="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          checked={user.walk_tracking_enabled}
          disabled={saving}
          onChange={() => save(() => updateMe({ walk_tracking_enabled: !user.walk_tracking_enabled }))}
          className="accent-primary"
        />
        <span>{t("trackingSettings.walks.account")}</span>
      </label>

      {!user.walk_tracking_enabled && (
        <p className="text-sm text-muted">{t("trackingSettings.walks.off")}</p>
      )}

      {user.walk_tracking_enabled && pets.length === 0 && (
        <p className="text-sm text-muted">{t("trackingSettings.walks.noPets")}</p>
      )}

      {user.walk_tracking_enabled && pets.map((pet) => (
        <div key={pet.id} className="flex flex-wrap items-center justify-between gap-3 py-2 border-t border-border">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={pet.walk_tracking_enabled}
              disabled={saving}
              onChange={() => save(() => updatePet(pet.id, { walk_tracking_enabled: !pet.walk_tracking_enabled }))}
              className="accent-primary"
            />
            <span>{pet.name}</span>
          </label>
        </div>
      ))}
    </section>
  );
}