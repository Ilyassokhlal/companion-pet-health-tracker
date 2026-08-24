import { ActivityIndicator, Pressable, Text } from "react-native";

import { useTheme } from "@/theme/ThemeContext";
import { themeColors } from "@/theme/palette";

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger";
};

export default function Button({ label, onPress, disabled, loading, variant = "primary" }: Props) {
  const { theme, accent } = useTheme();
  const colors = themeColors(theme, accent);

  const tone =
    variant === "primary"
      ? "bg-primary"
      : variant === "danger"
        ? "bg-danger"
        : "bg-surface border border-border";
  const label_tone =
    variant === "primary"
      ? "text-on-primary"
      : variant === "danger"
        ? "text-white"
        : "text-fg";
  const spinner =
    variant === "primary" ? colors.onPrimary : variant === "danger" ? "#ffffff" : colors.fg;
  const dimmed = disabled || loading ? "opacity-50" : "";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`w-full flex-row items-center justify-center rounded-lg px-4 py-3 ${tone} ${dimmed}`}
    >
      {loading ? <ActivityIndicator color={spinner} /> : <Text className={`font-semibold ${label_tone}`}>{label}</Text>}
    </Pressable>
  );
}