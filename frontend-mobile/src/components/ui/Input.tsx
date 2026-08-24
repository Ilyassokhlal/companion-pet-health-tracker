import { TextInput, type TextInputProps } from "react-native";

import { useTheme } from "@/theme/ThemeContext";
import { themeColors } from "@/theme/palette";

export default function Input(props: TextInputProps) {
  const { theme, accent } = useTheme();

  return (
    <TextInput
      placeholderTextColor={themeColors(theme, accent).muted}
      className="w-full rounded-lg border border-border bg-ink px-4 py-3 text-fg"
      {...props}
    />
  );
}