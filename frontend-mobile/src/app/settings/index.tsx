import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import Button from "@/components/ui/Button";
import { useAuth } from "@/auth/AuthContext";
import { useTheme } from "@/theme/ThemeContext";
import { themeColors } from "@/theme/palette";

// Seventeen-odd controls in one scrolling column stopped working on a phone. Each group is its own pushed screen; this is just the index.
// The label and hint live in en.json under settingsPage.groups; a const evaluated at import cannot call t().
const GROUPS = [
  { href: "/settings/account", key: "account" },
  { href: "/settings/appearance", key: "appearance" },
  { href: "/settings/notifications", key: "notifications" },
  { href: "/settings/units", key: "units" },
  { href: "/settings/privacy", key: "privacy" },
] as const;

export default function Settings() {
  const { t } = useTranslation();
  const { logout } = useAuth();
  const { theme, accent } = useTheme();
  const insets = useSafeAreaInsets();
  const colors = themeColors(theme, accent);

  return (
    <ScrollView
      className="flex-1 bg-ink"
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16 }}
    >
      <Text className="mb-6 text-2xl font-bold text-fg">{t("settingsPage.title")}</Text>

      <View className="mb-6 overflow-hidden rounded-xl border border-border bg-surface">
        {GROUPS.map((group, index) => (
          <Pressable
            key={group.href}
            onPress={() => router.navigate(group.href)}
            className={`flex-row items-center justify-between gap-3 p-5 active:opacity-70 ${
              index > 0 ? "border-t border-border" : ""
            }`}
          >
            <View className="min-w-0 flex-1">
              <Text className="text-fg">{t(`settingsPage.groups.${group.key}.label`)}</Text>
              <Text className="mt-0.5 text-sm text-muted">{t(`settingsPage.groups.${group.key}.hint`)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        ))}
      </View>

      <Button label={t("settingsPage.logout")} variant="secondary" onPress={logout} />
    </ScrollView>
  );
}