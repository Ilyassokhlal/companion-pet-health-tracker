import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

import { useTheme } from "@/theme/ThemeContext";
import { themeColors } from "@/theme/palette";

// Mobile version of the EmptyState component used to display a message and an icon when there is no content. The icon is displayed above the text, and both are centered with some padding around them.
// The hint, when there is one, says what the screen is for, so a new account learns why it might fill it. The text then reads as its heading.
export default function EmptyState({
  icon,
  text,
  hint,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
  hint?: string;
}) {
  const { theme, accent } = useTheme();
  const colors = themeColors(theme, accent);

  return (
    <View className="items-center justify-center gap-4 py-12">
      <View className="rounded-full border border-border bg-ink p-4">
        <Ionicons name={icon} size={28} color={colors.muted} />
      </View>
      <View className="max-w-xs gap-1">
        <Text className={`text-center ${hint ? "font-medium text-fg" : "text-muted"}`}>{text}</Text>
        {hint ? <Text className="text-center text-sm text-muted">{hint}</Text> : null}
      </View>
    </View>
  );
}
