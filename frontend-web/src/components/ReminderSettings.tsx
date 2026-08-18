import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { updateMe } from "../api/auth";

export default function ReminderSettings() {

  const { user, refreshUser } = useAuth();
  const [ saving, setSaving ] = useState(false);
  const [ error, setError ] = useState<string | null>(null);


    async function handleToggle() {
    if (!user) return;
    setSaving(true);
    setError(null);
    try {
      await updateMe({ reminders_enabled: !user.reminders_enabled });
      await refreshUser();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
    }

    async function handleZoneChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSaving(true);
    setError(null);
    try {
      await updateMe({ timezone: e.target.value });
      await refreshUser();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="p-6 bg-surface border border-border rounded-xl shadow-soft mb-6">
      <h2 className="text-lg font-semibold mb-4">Reminders</h2>
      {error && <p className="text-danger text-sm mb-4">{error}</p>}

      <label className="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          checked={user?.reminders_enabled ?? false}
          disabled={saving || !user?.email_verified}
          onChange={handleToggle}
          className="accent-primary"
        />
        <span>Enable reminders</span>
      </label>

      <label className="block">
        <span className="block text-sm text-muted mb-1">Timezone</span>
        <select
          value={user?.timezone ?? ""}
          onChange={handleZoneChange}
          disabled={saving}
          className="w-full rounded-lg bg-ink border border-border px-3 py-2.5 text-fg focus:border-primary focus:outline-none"
        >
          {Intl.supportedValuesOf("timeZone").map((tz) => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
      </label>

      <p className="text-sm text-muted mt-3">Reminders arrive at 8am in this timezone.</p>
      {!user?.email_verified && (
        <p className="text-sm text-muted mt-2">Verify your email to enable reminders.</p>
      )}
    </section>
  );
}