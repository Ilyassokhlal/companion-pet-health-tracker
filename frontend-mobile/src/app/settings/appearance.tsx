import { useTranslation } from "react-i18next";
import { ScrollView, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppearanceSettings from "@/components/AppearanceSettings";

export default function Appearance() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16 }}
    >
      <Text className="mb-6 text-2xl font-bold text-fg">{t("settings.appearance.title")}</Text>
      <AppearanceSettings />
    </ScrollView>
  );
}