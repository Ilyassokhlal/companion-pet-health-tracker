import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import Button from "@/components/ui/Button";
import { useAuth } from "@/auth/AuthContext";
import { useTheme } from "@/theme/ThemeContext";
import { themeColors } from "@/theme/palette";

// Seventeen-odd controls in one scrolling column stopped working on a phone. Each group is its own pushed screen; this is just the index.
const GROUPS = [
  { href: "/settings/account", label: "Account", hint: "Photo, username, email, password" },
  { href: "/settings/appearance", label: "Appearance", hint: "Theme and accent colour" },
  { href: "/settings/notifications", label: "Notifications", hint: "Reminders, push and weight check-ins" },
  { href: "/settings/units", label: "Units & Language", hint: "Measurement, currency and language" },
  { href: "/settings/privacy", label: "Data & Privacy", hint: "Legal pages and deleting your account" },
] as const;

export default function Settings() {
  const { logout } = useAuth();
  const { theme, accent } = useTheme();
  const insets = useSafeAreaInsets();
  const colors = themeColors(theme, accent);

  return (
    <ScrollView
      className="flex-1 bg-ink"
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16 }}
    >
      <Text className="mb-6 text-2xl font-bold text-fg">Settings</Text>

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
              <Text className="text-fg">{group.label}</Text>
              <Text className="mt-0.5 text-sm text-muted">{group.hint}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        ))}
      </View>

      <Button label="Log out" variant="secondary" onPress={logout} />
    </ScrollView>
  );
}