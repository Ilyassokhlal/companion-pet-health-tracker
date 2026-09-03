import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import type { BottomTabBarProps } from "expo-router/build/react-navigation/bottom-tabs";

import { useTheme } from "@/theme/ThemeContext";
import { themeColors } from "@/theme/palette";

// Mapping of route names to Ionicons glyphs for the tab bar. Each route has an "on" and "off" icon.
const ICONS: Record<string, { on: keyof typeof Ionicons.glyphMap; off: keyof typeof Ionicons.glyphMap }> = {
  index: { on: "home", off: "home-outline" },
  records: { on: "clipboard", off: "clipboard-outline" },
  tracking: { on: "trending-up", off: "trending-up-outline" },
  photos: { on: "images", off: "images-outline" },
  chat: { on: "chatbubble", off: "chatbubble-outline" },
};

// Mapping of route names to translation keys for the tab bar labels. The "index" route corresponds to the "dashboard" label.
const NAV_KEY: Record<string, string> = { index: "dashboard" };

export default function TabBar({ state, navigation, insets }: BottomTabBarProps) {
  const { t } = useTranslation();
  const { theme, accent } = useTheme();
  const colors = themeColors(theme, accent);

  return (
    <View
      // Container for the tab bar. Positioned with margins and bottom inset to avoid overlapping content.
      style={{
        marginHorizontal: 14,
        marginBottom: insets.bottom + 8,
        // Apply a semi-transparent background color using an 8-digit hex code.
        backgroundColor: `${colors.surface}E6`,
        borderColor: colors.border,
      }}
      className="flex-row items-center rounded-3xl border px-2 py-2"
    >
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const icon = ICONS[route.name] ?? ICONS.index;
        const label = t(`nav.${NAV_KEY[route.name] ?? route.name}`);

        return (
          <Pressable
            key={route.key}
            accessibilityRole="button"
            accessibilityState={focused ? { selected: true } : {}}
            accessibilityLabel={label}
            onPress={() => {
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!focused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            }}
            style={focused ? { backgroundColor: `${colors.primary}26` } : undefined}
            className="flex-1 items-center justify-center rounded-2xl py-2 active:opacity-60"
          >
            <Ionicons
              name={focused ? icon.on : icon.off}
              size={22}
              color={focused ? colors.primary : colors.muted}
            />
            {focused ? (
              <Text numberOfLines={1} style={{ color: colors.primary }} className="mt-0.5 text-[10px] font-semibold">
                {label}
              </Text>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}