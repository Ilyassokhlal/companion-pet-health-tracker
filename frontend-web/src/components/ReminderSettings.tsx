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
    <section>
      <h2>Reminder Settings</h2>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <label>
        <input
          type="checkbox"
          checked={user?.reminders_enabled ?? false}
          disabled={saving || !user?.email_verified}
          onChange={handleToggle}
        />
        Enable reminders
      </label>
      <label>
        Timezone:
        <select value={user?.timezone ?? ""} onChange={handleZoneChange} disabled={saving}>
          {Intl.supportedValuesOf("timeZone").map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </label>
      {!user?.email_verified && <p>You need to verify your email to enable reminders.</p>}
    </section>
  );
}