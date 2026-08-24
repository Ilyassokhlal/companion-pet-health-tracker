import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Modal, Pressable, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useAuth } from "@/auth/AuthContext";
import { updateMe, listTimezones } from "@/api/auth";
import { useTheme } from "@/theme/ThemeContext";
import { themeColors } from "@/theme/palette";

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

      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-fg">Enable reminders</Text>
        <Switch
          value={user.reminders_enabled}
          disabled={saving || !user.email_verified}
          onValueChange={(v) => save({ reminders_enabled: v })}
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

      <Text className="mb-2 text-sm text-muted">Reminders arrive at 8am in this timezone.</Text>
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