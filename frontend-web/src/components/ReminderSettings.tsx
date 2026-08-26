import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { updateMe } from "../api/auth";
import { REMINDER_FREQUENCIES } from "../types";
import type { ReminderFrequency } from "../types";

export default function ReminderSettings() {

  const { user, refreshUser } = useAuth();
  const [ saving, setSaving ] = useState(false);
  const [ error, setError ] = useState<string | null>(null);

  // Saves a partial update to the user's settings and refreshes the user data. Handles loading and error states.
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

  // Determines if the reminder settings should be locked, either due to saving in progress or the user's email not being verified.
  const locked = saving || !user?.email_verified;

  return (
    <section className="p-6 bg-surface border border-border rounded-xl shadow-soft mb-6">
      <h2 className="text-lg font-semibold mb-4">Reminders</h2>
      {error && <p className="text-danger text-sm mb-4">{error}</p>}

      <label className="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          checked={user?.reminders_enabled ?? false}
          disabled={locked}
          onChange={() => save({ reminders_enabled: !user?.reminders_enabled })}
          className="accent-primary"
        />
        <span>Email me what is due</span>
      </label>

      <label className="block mb-4">
        <span className="block text-sm text-muted mb-1">How often</span>
        <select
          value={user?.reminder_frequency ?? "weekly"}
          onChange={(e) => save({ reminder_frequency: e.target.value as ReminderFrequency })}
          disabled={locked || !user?.reminders_enabled}
          className="w-full rounded-lg bg-ink border border-border px-3 py-2.5 text-fg focus:border-primary focus:outline-none disabled:opacity-50"
        >
          {REMINDER_FREQUENCIES.map((frequency) => (
            <option key={frequency} value={frequency}>
              {frequency === "weekly" ? "Weekly, on Sunday" : "Every day"}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          checked={user?.push_enabled ?? false}
          disabled={locked}
          onChange={() => save({ push_enabled: !user?.push_enabled })}
          className="accent-primary"
        />
        <span>Notify my phone about what is due today</span>
      </label>

      <label className="block">
        <span className="block text-sm text-muted mb-1">Timezone</span>
        <select
          value={user?.timezone ?? ""}
          onChange={(e) => save({ timezone: e.target.value })}
          disabled={saving}
          className="w-full rounded-lg bg-ink border border-border px-3 py-2.5 text-fg focus:border-primary focus:outline-none"
        >
          {Intl.supportedValuesOf("timeZone").map((tz) => (
            <option key={tz} value={tz}>{tz}</option>
          ))}
        </select>
      </label>

      <p className="text-sm text-muted mt-3">Everything arrives at 6am in this timezone.</p>
      {!user?.email_verified && (
        <p className="text-sm text-muted mt-2">Verify your email to enable reminders.</p>
      )}
    </section>
  );
}