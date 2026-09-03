import { useTranslation } from "react-i18next";
import { ScrollView, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ReminderSettings from "@/components/ReminderSettings";
import WeightSettings from "@/components/WeightSettings";
import WalkSettings from "@/components/WalkSettings";
import FeedingSettings from "@/components/FeedingSettings";

export default function Notifications() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16 }}
    >
      <Text className="mb-6 text-2xl font-bold text-fg">{t("settingsPage.groups.notifications.label")}</Text>
      <ReminderSettings />
      <WeightSettings />
      <WalkSettings />
      <FeedingSettings />
    </ScrollView>
  );
}