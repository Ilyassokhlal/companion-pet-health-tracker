import { Pressable, ScrollView, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/auth/AuthContext";
import SwipeTabs from "@/components/SwipeTabs";


// Tracking screen with tabs for different tracking categories.
export default function Tracking() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <SwipeTabs>
      <ScrollView
        className="flex-1 bg-ink"
        contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16 }}
      >
        <Text className="mb-6 text-2xl font-bold text-fg">{t("tracking.title")}</Text>

        <Pressable
          onPress={() => router.navigate("/tracking/weight")}
          className="rounded-xl border border-border bg-surface p-5 active:opacity-70"
        >
          <Text className="text-lg font-semibold text-fg">{t("tracking.weight")}</Text>
          <Text className="mt-1 text-sm text-muted">{t("tracking.weightHint")}</Text>
        </Pressable>

        {user?.walk_tracking_enabled ? (
          <Pressable
            onPress={() => router.navigate("/tracking/walks")}
            className="mt-4 rounded-xl border border-border bg-surface p-5 active:opacity-70"
          >
            <Text className="text-lg font-semibold text-fg">{t("tracking.walks")}</Text>
            <Text className="mt-1 text-sm text-muted">{t("tracking.walksHint")}</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => router.navigate("/tracking/feeding")}
          className="mt-4 rounded-xl border border-border bg-surface p-5 active:opacity-70"
        >
          <Text className="text-lg font-semibold text-fg">{t("tracking.feeding")}</Text>
          <Text className="mt-1 text-sm text-muted">{t("tracking.feedingHint")}</Text>
        </Pressable>

        <Pressable
          onPress={() => router.navigate("/tracking/budget")}
          className="mt-4 rounded-xl border border-border bg-surface p-5 active:opacity-70"
        >
          <Text className="text-lg font-semibold text-fg">{t("tracking.budget")}</Text>
          <Text className="mt-1 text-sm text-muted">{t("tracking.budgetHint")}</Text>
        </Pressable>
      </ScrollView>
    </SwipeTabs>
  );
}