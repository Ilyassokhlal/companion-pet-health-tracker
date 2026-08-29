import { ScrollView, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ReminderSettings from "@/components/ReminderSettings";
import WeightSettings from "@/components/WeightSettings";
import WalkSettings from "@/components/WalkSettings";

export default function Notifications() {
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      className="flex-1 bg-ink"
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16 }}
    >
      <Text className="mb-6 text-2xl font-bold text-fg">Notifications & Tracking</Text>
      <ReminderSettings />
      <WeightSettings />
      <WalkSettings />
    </ScrollView>
  );
}