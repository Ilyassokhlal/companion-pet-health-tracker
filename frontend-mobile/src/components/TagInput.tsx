import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import Input from "@/components/ui/Input";
import { useTheme } from "@/theme/ThemeContext";
import { themeColors } from "@/theme/palette";

type Props = {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
};

// A list of short text entries, added one at a time and shown as removable chips.
// Tapping a chip removes it. There is no hover on a phone to reveal a delete affordance.
export default function TagInput({ label, values, onChange, placeholder }: Props) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");
  const { theme, accent } = useTheme();
  const colors = themeColors(theme, accent);

  function add() {
    const entry = draft.trim();
    if (!entry || values.includes(entry)) {
      setDraft("");
      return;
    }
    onChange([...values, entry]);
    setDraft("");
  }

  return (
    <View>
      <Text className="mb-1 text-sm text-muted">{label}</Text>
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Input
            value={draft}
            onChangeText={setDraft}
            placeholder={placeholder}
            maxLength={100}
            returnKeyType="done"
            onSubmitEditing={add}
          />
        </View>
        <Pressable
          onPress={add}
          className="shrink-0 justify-center rounded-lg border border-border bg-ink px-4 active:opacity-70"
        >
          <Text className="text-fg">{t("tagInput.add")}</Text>
        </Pressable>
      </View>
      {values.length > 0 ? (
        <View className="mt-2 flex-row flex-wrap gap-2">
          {values.map((value) => (
            <Pressable
              key={value}
              onPress={() => onChange(values.filter((v) => v !== value))}
              className="flex-row items-center gap-1.5 rounded-full border border-border bg-ink px-3 py-1 active:opacity-70"
            >
              <Text className="text-sm text-fg">{value}</Text>
              <Ionicons name="close" size={14} color={colors.muted} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}