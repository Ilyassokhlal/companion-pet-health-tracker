import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { updateMe } from "../api/auth";
import { errorMessage } from "../errors";

// Component for managing feeding reminders for the current user.
// Allows enabling or disabling push and email notifications for feeding reminders.
export default function FeedingSettings() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(action: () => Promise<unknown>) {
    setSaving(true);
    setError(null);
    try {
      await action();
      await refreshUser();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <section className="p-6 bg-surface border border-border rounded-xl shadow-soft mb-6">
      <h2 className="text-lg font-semibold mb-4">{t("trackingSettings.feeding.title")}</h2>
      {error && <p className="text-danger text-sm mb-4">{error}</p>}
      <p className="text-sm text-muted mb-4">
        {t("trackingSettings.feeding.note")}
      </p>

      <label className="flex items-center gap-2 mb-3">
        <input
          type="checkbox"
          checked={user.feeding_push_enabled}
          disabled={saving}
          onChange={() => save(() => updateMe({ feeding_push_enabled: !user.feeding_push_enabled }))}
          className="accent-primary"
        />
        <span>{t("trackingSettings.feeding.push")}</span>
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={user.feeding_email_enabled}
          disabled={saving}
          onChange={() => save(() => updateMe({ feeding_email_enabled: !user.feeding_email_enabled }))}
          className="accent-primary"
        />
        <span>{t("trackingSettings.feeding.email")}</span>
      </label>
    </section>
  );
}