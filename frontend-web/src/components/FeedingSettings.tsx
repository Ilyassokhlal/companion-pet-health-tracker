import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { updateMe } from "../api/auth";

// Component for managing feeding reminders for the current user.
// Allows enabling or disabling push and email notifications for feeding reminders.
export default function FeedingSettings() {
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
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <section className="p-6 bg-surface border border-border rounded-xl shadow-soft mb-6">
      <h2 className="text-lg font-semibold mb-4">Feeding reminders</h2>
      {error && <p className="text-danger text-sm mb-4">{error}</p>}
      <p className="text-sm text-muted mb-4">
        Fires at each scheduled feeding time when nothing has been logged for it. Separate from the daily
        reminder digest.
      </p>

      <label className="flex items-center gap-2 mb-3">
        <input
          type="checkbox"
          checked={user.feeding_push_enabled}
          disabled={saving}
          onChange={() => save(() => updateMe({ feeding_push_enabled: !user.feeding_push_enabled }))}
          className="accent-primary"
        />
        <span>Push notification</span>
      </label>

      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={user.feeding_email_enabled}
          disabled={saving}
          onChange={() => save(() => updateMe({ feeding_email_enabled: !user.feeding_email_enabled }))}
          className="accent-primary"
        />
        <span>Email</span>
      </label>
    </section>
  );
}