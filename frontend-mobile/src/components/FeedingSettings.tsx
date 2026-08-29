import { useState } from "react";
import { Switch, Text, View } from "react-native";

import { useAuth } from "@/auth/AuthContext";
import { updateMe } from "@/api/auth";

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
    <View className="mb-6 rounded-xl border border-border bg-surface p-5">
      <Text className="mb-4 text-lg font-semibold text-fg">Feeding reminders</Text>
      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}
      <Text className="mb-4 text-sm text-muted">
        Fires at each scheduled feeding time when nothing has been logged for it. Separate from the daily
        reminder digest.
      </Text>

      <View className="mb-4 flex-row items-center justify-between gap-3">
        <Text className="shrink text-fg">Push notification</Text>
        <Switch
          value={user.feeding_push_enabled ?? false}
          disabled={saving}
          onValueChange={(v) => save(() => updateMe({ feeding_push_enabled: v }))}
        />
      </View>

      <View className="flex-row items-center justify-between gap-3">
        <Text className="shrink text-fg">Email</Text>
        <Switch
          value={user.feeding_email_enabled ?? false}
          disabled={saving}
          onValueChange={(v) => save(() => updateMe({ feeding_email_enabled: v }))}
        />
      </View>
    </View>
  );
}