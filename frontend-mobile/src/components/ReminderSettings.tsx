import { useMemo, useState } from "react";
import { FlatList, Modal, Pressable, Switch, Text, View } from "react-native";

import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useAuth } from "@/auth/AuthContext";
import { updateMe } from "@/api/auth";

// Hermes ships a trimmed Intl. supportedValuesOf may be missing, in which case the list falls back to the device's own zone so the picker is never empty.
function zoneList(): string[] {
  const intl = Intl as unknown as { supportedValuesOf?: (k: string) => string[] };
  if (typeof intl.supportedValuesOf === "function") return intl.supportedValuesOf("timeZone");
  return [Intl.DateTimeFormat().resolvedOptions().timeZone];
}

// Component for managing reminder settings, including enabling/disabling reminders and selecting a timezone.
export default function ReminderSettings() {
  const { user, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState("");

  const zones = useMemo(zoneList, []);
  const filtered = useMemo(
    () => zones.filter((z) => z.toLowerCase().includes(query.toLowerCase())),
    [zones, query],
  );

  async function save(data: { reminders_enabled?: boolean; timezone?: string }) {
    try {
      setSaving(true);
      setError("");
      await updateMe(data);
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
      {/* heading "Reminders" */}
      <Text className="mb-4 text-lg font-semibold text-fg">Reminders</Text>
      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-fg">Enable reminders</Text>
        <Switch
          value={user.reminders_enabled}
          disabled={saving || !user.email_verified}
          onValueChange={(v) => save({ reminders_enabled: v })}
        />
      </View>
      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-fg">Timezone</Text>
        <Pressable onPress={() => setPicking(true)}>
          <Text className="text-primary">{user.timezone}</Text>
        </Pressable>
      </View>
      <Text className="mb-2 text-sm text-muted">Reminders arrive at 8am in this timezone.</Text>
      {!user.email_verified ? (
        <Text className="mb-2 text-sm text-muted">Verify your email to enable reminders.</Text>
      ) : null}
    </View>
  );
}