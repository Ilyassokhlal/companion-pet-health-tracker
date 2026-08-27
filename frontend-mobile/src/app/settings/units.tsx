import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/auth/AuthContext";
import { updateMe } from "@/api/auth";
import { CURRENCIES, LANGUAGES, UNIT_SYSTEMS } from "@/types";
import { useTheme } from "@/theme/ThemeContext";
import { themeColors } from "@/theme/palette";

const UNIT_LABELS: Record<string, string> = {
  metric: "Metric (kg, km)",
  imperial: "Imperial (lb, mi)",
};

export default function Units() {
  const { user, refreshUser } = useAuth();
  const { theme, accent } = useTheme();
  const insets = useSafeAreaInsets();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
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

  if (!user) return null;

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
          Weights are always stored in kilograms — this only changes how they are shown and entered.
        </Text>
      </View>

      <View className="mb-6 overflow-hidden rounded-xl border border-border bg-surface">
        <Text className="p-5 pb-3 text-lg font-semibold text-fg">Currency</Text>
        {CURRENCIES.map((currency) => (
          <Pressable
            key={currency.code}
            onPress={() => save({ currency: currency.code })}
            disabled={saving}
            className="flex-row items-center justify-between gap-3 border-t border-border px-5 py-3 active:opacity-70"
          >
            <Text className="text-fg">
              {currency.code} — {currency.name}
            </Text>
            {user.currency === currency.code ? (
              <Ionicons name="checkmark" size={18} color={colors.primary} />
            ) : null}
          </Pressable>
        ))}
      </View>

      <View className="mb-6 overflow-hidden rounded-xl border border-border bg-surface">
        <Text className="p-5 pb-3 text-lg font-semibold text-fg">Language</Text>
        {LANGUAGES.map((language) => (
          <Pressable
            key={language.code}
            onPress={() => save({ language: language.code })}
            disabled={saving}
            className="flex-row items-center justify-between gap-3 border-t border-border px-5 py-3 active:opacity-70"
          >
            <Text className="text-fg">{language.name}</Text>
            {user.language === language.code ? (
              <Ionicons name="checkmark" size={18} color={colors.primary} />
            ) : null}
          </Pressable>
        ))}
        <Text className="border-t border-border px-5 py-3 text-sm text-muted">
          Most of the app is still English while translations are in progress.
        </Text>
      </View>
    </ScrollView>
  );
}