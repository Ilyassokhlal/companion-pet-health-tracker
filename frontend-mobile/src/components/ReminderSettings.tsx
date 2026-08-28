import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useAuth } from "@/auth/AuthContext";
import { updateMe, listTimezones } from "@/api/auth";
import { useTheme } from "@/theme/ThemeContext";
import { themeColors } from "@/theme/palette";
import { REMINDER_FREQUENCIES } from "@/types";

export default function ReminderSettings() {
  const { user, refreshUser } = useAuth();
  const insets = useSafeAreaInsets();
  const { theme, accent } = useTheme();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [picking, setPicking] = useState(false);
  const [query, setQuery] = useState("");
  const [zones, setZones] = useState<string[]>([]);
  const [loadingZones, setLoadingZones] = useState(false);

  // Fetched when the picker opens, not on every visit to Settings. Hermes has no
  // Intl.supportedValuesOf, and the server is the only source that matches what it accepts.
  useEffect(() => {
    if (!picking || zones.length > 0) return;
    (async () => {
      try {
        setLoadingZones(true);
        setZones(await listTimezones());
      } catch (err) {
        setError((err as Error).message);
        setPicking(false);
      } finally {
        setLoadingZones(false);
      }
    })();
  }, [picking, zones.length]);

  const filtered = useMemo(
    () => zones.filter((z) => z.toLowerCase().includes(query.toLowerCase())),
    [zones, query],
  );

  async function save(data: Parameters<typeof updateMe>[0]) {
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

  function choose(zone: string) {
    setPicking(false);
    setQuery("");
    save({ timezone: zone });
  }

  if (!user) return null;

  return (
    <View className="mb-6 rounded-xl border border-border bg-surface p-5">
      <Text className="mb-4 text-lg font-semibold text-fg">Reminders</Text>
      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

      <View className="mb-4 flex-row items-center justify-between gap-3">
        <Text className="shrink text-fg">Email me what is due</Text>
        <Switch
          value={user.reminders_enabled}
          disabled={saving || !user.email_verified}
          onValueChange={(v) => save({ reminders_enabled: v })}
        />
      </View>

      <View className="mb-4 flex-row items-center justify-between gap-3">
        <Text className="shrink-0 text-fg">How often</Text>
        <View className="flex-row gap-2">
          {REMINDER_FREQUENCIES.map((frequency) => (
            <Pressable
              key={frequency}
              onPress={() => save({ reminder_frequency: frequency })}
              disabled={saving || !user.reminders_enabled}
              className={`rounded-full px-3 py-1.5 active:opacity-70 ${
                user.reminder_frequency === frequency ? "bg-primary" : "border border-border bg-ink"
              } ${user.reminders_enabled ? "" : "opacity-50"}`}
            >
              <Text
                className={`text-sm ${
                  user.reminder_frequency === frequency ? "text-on-primary" : "text-fg"
                }`}
              >
                {frequency === "weekly" ? "Sundays" : "Daily"}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View className="mb-4 flex-row items-center justify-between gap-3">
        <Text className="shrink text-fg">Notify this phone about today</Text>
        <Switch
          value={user.push_enabled ?? false}
          disabled={saving || !user.email_verified}
          onValueChange={(v) => save({ push_enabled: v })}
        />
      </View>

      <View className="mb-4 flex-row items-center justify-between gap-3">
        <Text className="shrink-0 text-fg">Timezone</Text>
        <Pressable
          onPress={() => setPicking(true)}
          disabled={saving}
          className="min-w-0 shrink rounded-full border border-border bg-ink px-3 py-1.5 active:opacity-70"
        >
          <Text numberOfLines={1} className="text-sm text-primary">{user.timezone}</Text>
        </Pressable>
      </View>

      <Text className="mb-2 text-sm text-muted">Everything arrives at 6am in this timezone.</Text>
      {!user.email_verified ? (
        <Text className="mb-2 text-sm text-muted">Verify your email to enable reminders.</Text>
      ) : null}

      <Modal visible={picking} animationType="slide" onRequestClose={() => setPicking(false)}>
        <View className="flex-1 bg-ink px-4" style={{ paddingTop: insets.top + 16 }}>
          <Text className="mb-4 text-xl font-bold text-fg">Choose a timezone</Text>

          <Input
            value={query}
            onChangeText={setQuery}
            placeholder="Search"
            autoCapitalize="none"
            autoCorrect={false}
          />

          {loadingZones ? (
            <ActivityIndicator className="mt-8" color={themeColors(theme, accent).primary} />
          ) : (
            <FlatList
              className="mt-4"
              data={filtered}
              keyExtractor={(z) => z}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => choose(item)}
                  className="border-b border-border py-3 active:opacity-70"
                >
                  <Text className={item === user.timezone ? "text-primary" : "text-fg"}>{item}</Text>
                </Pressable>
              )}
            />
          )}

          <View className="py-4">
            <Button label="Close" variant="secondary" onPress={() => setPicking(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
}