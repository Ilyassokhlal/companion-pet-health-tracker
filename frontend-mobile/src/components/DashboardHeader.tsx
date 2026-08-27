import { Image, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { useAuth } from "@/auth/AuthContext";
import { useTheme } from "@/theme/ThemeContext";
import { themeColors } from "@/theme/palette";

const BASE = process.env.EXPO_PUBLIC_API_URL;

// The Dashboard's top bar: avatar to the account screen, username in the middle, gear to Settings.
// Dashboard only — every other screen paints its own top inset instead of sharing a header.
export default function DashboardHeader() {
  const { user } = useAuth();
  const { theme, accent } = useTheme();
  const insets = useSafeAreaInsets();

  if (!user) return null;

  return (
    <View
      style={{ paddingTop: insets.top }}
      className="flex-row items-center gap-3 border-b border-border bg-ink px-4 pb-3"
    >
      <Pressable
        onPress={() => router.navigate("/settings/account")}
        className="w-9 active:opacity-70"
      >
        {user.photo_filename ? (
          <Image
            source={{ uri: `${BASE}/photos/${user.photo_filename}` }}
            className="h-9 w-9 rounded-full"
          />
        ) : (
          <View className="h-9 w-9 items-center justify-center rounded-full border border-border bg-surface">
            <Text className="font-bold text-fg">{user.username.charAt(0).toUpperCase()}</Text>
          </View>
        )}
      </Pressable>

      <Text numberOfLines={1} className="flex-1 text-center text-base font-semibold text-fg">
        {user.username}
      </Text>

      <Pressable
        onPress={() => router.navigate("/settings")}
        className="w-9 items-end active:opacity-70"
      >
        <Ionicons name="settings-outline" size={24} color={themeColors(theme, accent).fg} />
      </Pressable>
    </View>
  );
}