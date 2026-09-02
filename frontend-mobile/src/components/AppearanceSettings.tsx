import { useTranslation } from "react-i18next";
import { Switch, Text, View, Pressable } from "react-native";
import { useTheme } from "@/theme/ThemeContext";
import { ACCENTS, accentColor } from "@/theme/palette";

export default function AppearanceSettings() {
  const { t } = useTranslation();
  const { theme, accent, setTheme, setAccent } = useTheme();

  return (
    <View className="mb-6 rounded-xl border border-border bg-surface p-5">
      <Text className="mb-4 text-lg font-semibold text-fg">{t("settings.appearance.title")}</Text>

      <View className="mb-4 flex-row items-center justify-between">
        <Text className="text-fg">{t("settings.appearance.darkMode")}</Text>
        <Switch
          value={theme === "dark"}
          onValueChange={(v) => setTheme(v ? "dark" : "light")}
        />
      </View>

      <View className="flex-row items-center justify-between">
        <Text className="text-fg">{t("settings.appearance.accent")}</Text>
        <View className="flex-row gap-2">
          {ACCENTS.map(a => (
            <Pressable
              key={a}
              onPress={() => setAccent(a)}
              accessibilityLabel={a}
              className={`h-7 w-7 rounded-full ${accent === a ? "border-2 border-fg" : ""}`}
              style={{ backgroundColor: accentColor(theme, a) }}
            />
          ))}
        </View>
      </View>
    </View>
  );
}