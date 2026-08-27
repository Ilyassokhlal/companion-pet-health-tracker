import { Pressable, ScrollView, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";

import SwipeTabs from "@/components/SwipeTabs";

// Tracking screen with tabs for different tracking categories.
export default function Tracking() {
  const insets = useSafeAreaInsets();

  return (
    <SwipeTabs>
      <ScrollView
        className="flex-1 bg-ink"
        contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16 }}
      >
        <Text className="mb-6 text-2xl font-bold text-fg">Tracking</Text>

        <Pressable
          onPress={() => router.navigate("/tracking/weight")}
          className="rounded-xl border border-border bg-surface p-5 active:opacity-70"
        >
          <Text className="text-lg font-semibold text-fg">Weight</Text>
          <Text className="mt-1 text-sm text-muted">Weigh-ins and how they have changed</Text>
        </Pressable>
      </ScrollView>
    </SwipeTabs>
  );
}
