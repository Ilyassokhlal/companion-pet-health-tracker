import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, FlatList, I18nManager, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import Button from "@/components/ui/Button";
import { useAuth } from "@/auth/AuthContext";
import { updateMe } from "@/api/auth";
import { CURRENCIES, LANGUAGES, UNIT_SYSTEMS } from "@/types";
import type { LanguageCode } from "@/types";
import { useTheme } from "@/theme/ThemeContext";
import { themeColors } from "@/theme/palette";
import { errorMessage } from "@/errors";
import * as Updates from "expo-updates";

type Picker = "currency" | "language";

// This screen allows the user to select their preferred unit system (metric or imperial), currency, and language.
export default function Units() {
  const { t } = useTranslation();
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
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  // Apply the selected language, handling RTL changes for Arabic and prompting for a restart if necessary.
  async function applyLanguage(code: string) {
    await save({ language: code as LanguageCode });
    const nextRTL = code === "ar";
    if (nextRTL === I18nManager.isRTL) return;
    Alert.alert(t("settings.preferences.restartTitle"), t("settings.preferences.restartBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("settings.preferences.restartNow"),
        onPress: async () => {
          I18nManager.forceRTL(nextRTL);
          try {
            await Updates.reloadAsync();
          } catch {
            // If reloadAsync fails, the app will need to be restarted manually. The preference is already saved.
            setError(t("errors.generic"));
          }
        },
      },
    ]);
  }

  function choose(code: string) {
    const target = picking;
    setPicking(null);
    if (target === "currency") save({ currency: code });
    if (target === "language") applyLanguage(code);
  }

  if (!user) return null;

  const currencyName = CURRENCIES.find((c) => c.code === user.currency)?.name;
  const languageName = LANGUAGES.find((l) => l.code === user.language)?.name;
  const options: ReadonlyArray<{ code: string; name: string }> = picking === "currency" ? CURRENCIES : LANGUAGES;
  const selected = picking === "currency" ? user.currency : user.language;

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16 }}
    >
      <Text className="mb-6 text-2xl font-bold text-fg">{t("settings.preferences.title")}</Text>
      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

      <View className="mb-6 rounded-xl border border-border bg-surface p-5">
        <Text className="mb-3 text-lg font-semibold text-fg">{t("settings.preferences.measurements")}</Text>
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
                {t(`settings.preferences.${unit}`)}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text className="mt-3 text-sm text-muted">
          {t("settings.preferences.metricHint")}
        </Text>
        <Text className="text-sm text-muted">
          {t("settings.preferences.imperialHint")}
        </Text>
      </View>

      <View className="mb-6 rounded-xl border border-border bg-surface p-5">
        <Text className="mb-4 text-lg font-semibold text-fg">{t("settings.preferences.currency")}</Text>
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
        <Text className="mb-4 text-lg font-semibold text-fg">{t("settings.preferences.language")}</Text>
        <Pressable
          onPress={() => setPicking("language")}
          disabled={saving}
          className="flex-row items-center justify-between gap-3 rounded-lg border border-border bg-ink px-3 py-2.5 active:opacity-70"
        >
          <Text className="text-fg">{languageName ?? user.language}</Text>
          <Ionicons name="chevron-down" size={16} color={colors.muted} />
        </Pressable>
        <Text className="mt-3 text-sm text-muted">
          {t("settings.preferences.note")}
        </Text>
      </View>

      <Modal visible={picking !== null} animationType="slide" onRequestClose={() => setPicking(null)}>
        <View className="flex-1 bg-ink px-4" style={{ paddingTop: insets.top + 16 }}>
          <Text className="mb-4 text-xl font-bold text-fg">
            {picking === "currency" ? t("settings.preferences.chooseCurrency") : t("settings.preferences.chooseLanguage")}
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
            <Button label={t("common.close")} variant="secondary" onPress={() => setPicking(null)} />
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}