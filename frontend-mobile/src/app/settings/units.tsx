import { useState } from "react";
import { FlatList, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import Button from "@/components/ui/Button";
import { useAuth } from "@/auth/AuthContext";
import { updateMe } from "@/api/auth";
import { CURRENCIES, LANGUAGES, UNIT_SYSTEMS } from "@/types";
import type { LanguageCode } from "@/types";
import { useTheme } from "@/theme/ThemeContext";
import { themeColors } from "@/theme/palette";

const UNIT_LABELS: Record<string, string> = {
  metric: "Metric (kg, km)",
  imperial: "Imperial (lb, mi)",
};

type Picker = "currency" | "language";

// This screen allows the user to select their preferred unit system (metric or imperial), currency, and language.
export default function Units() {
  const { user, refreshUser } = useAuth();
  const { theme, accent } = useTheme();
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [picking, setPicking] = useState<Picker | null>(null);
  const colors = themeColors(theme, accent);

  async function save(patch: Parameters<typeof updateMe>[0]) {
    try {
      setSaving(true);
      setError("");
      await updateMe(patch);
      await refreshUser();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function choose(code: string) {
    const target = picking;
    setPicking(null);
    if (target === "currency") save({ currency: code });
    if (target === "language") save({ language: code as LanguageCode });
  }

  if (!user) return null;

  const currencyName = CURRENCIES.find((c) => c.code === user.currency)?.name;
  const languageName = LANGUAGES.find((l) => l.code === user.language)?.name;
  const options: ReadonlyArray<{ code: string; name: string }> = picking === "currency" ? CURRENCIES : LANGUAGES;
  const selected = picking === "currency" ? user.currency : user.language;

  return (
    <ScrollView
      className="flex-1 bg-ink"
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16 }}
    >
      <Text className="mb-6 text-2xl font-bold text-fg">Units & Language</Text>
      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

      <View className="mb-6 rounded-xl border border-border bg-surface p-5">
        <Text className="mb-3 text-lg font-semibold text-fg">Measurements</Text>
        <View className="flex-row flex-wrap gap-2">
          {UNIT_SYSTEMS.map((unit) => (
            <Pressable
              key={unit}
              onPress={() => save({ unit_system: unit })}
              disabled={saving}
              className={`rounded-lg px-3 py-2 ${
                user.unit_system === unit ? "bg-primary" : "border border-border bg-ink"
              }`}
            >
              <Text
                className={`text-sm ${user.unit_system === unit ? "text-on-primary" : "text-fg"}`}
              >
                {UNIT_LABELS[unit]}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text className="mt-3 text-sm text-muted">
          Metric — weight in kilograms, distance in kilometers
        </Text>
        <Text className="text-sm text-muted">
          Imperial — weight in pounds, distance in miles
        </Text>
      </View>

      <View className="mb-6 rounded-xl border border-border bg-surface p-5">
        <Text className="mb-4 text-lg font-semibold text-fg">Currency</Text>
        <Pressable
          onPress={() => setPicking("currency")}
          disabled={saving}
          className="flex-row items-center justify-between gap-3 rounded-lg border border-border bg-ink px-3 py-2.5 active:opacity-70"
        >
          <Text className="text-fg">
            {currencyName ? `${user.currency} — ${currencyName}` : user.currency}
          </Text>
          <Ionicons name="chevron-down" size={16} color={colors.muted} />
        </Pressable>
      </View>

      <View className="mb-6 rounded-xl border border-border bg-surface p-5">
        <Text className="mb-4 text-lg font-semibold text-fg">Language</Text>
        <Pressable
          onPress={() => setPicking("language")}
          disabled={saving}
          className="flex-row items-center justify-between gap-3 rounded-lg border border-border bg-ink px-3 py-2.5 active:opacity-70"
        >
          <Text className="text-fg">{languageName ?? user.language}</Text>
          <Ionicons name="chevron-down" size={16} color={colors.muted} />
        </Pressable>
        <Text className="mt-3 text-sm text-muted">
          Most of the app is still English while translations are in progress.
        </Text>
      </View>

      <Modal visible={picking !== null} animationType="slide" onRequestClose={() => setPicking(null)}>
        <View className="flex-1 bg-ink px-4" style={{ paddingTop: insets.top + 16 }}>
          <Text className="mb-4 text-xl font-bold text-fg">
            {picking === "currency" ? "Choose a currency" : "Choose a language"}
          </Text>
          <FlatList
            data={options}
            keyExtractor={(item) => item.code}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => choose(item.code)}
                className="border-b border-border py-3 active:opacity-70"
              >
                <Text className={item.code === selected ? "text-primary" : "text-fg"}>
                  {picking === "currency" ? `${item.code} — ${item.name}` : item.name}
                </Text>
              </Pressable>
            )}
          />
          <View className="py-4">
            <Button label="Close" variant="secondary" onPress={() => setPicking(null)} />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}