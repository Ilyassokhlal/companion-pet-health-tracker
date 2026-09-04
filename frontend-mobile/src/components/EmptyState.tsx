import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { useTheme } from "@/theme/ThemeContext";
import { themeColors } from "@/theme/palette";

// Mobile version of the EmptyState component used to display a message and an icon when there is no content. The icon is displayed above the text, and both are centered with some padding around them.
export default function EmptyState({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  const { theme, accent } = useTheme();
  const colors = themeColors(theme, accent);

  return (
    <View className="items-center justify-center gap-4 py-12">
      <View className="rounded-full border border-border bg-ink p-4">
        <Ionicons name={icon} size={28} color={colors.muted} />
      </View>
      <Text className="max-w-xs text-center text-muted">{text}</Text>
    </View>
  );
}