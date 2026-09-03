import { useCallback, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/auth/AuthContext";
import { usePets } from "@/context/PetContext";
import SwipeTabs from "@/components/SwipeTabs";
import { listRecords } from "@/api/records";
import { listWalks } from "@/api/walks";
import { feedingStatus } from "@/api/feeding";
import { getExpenseSummary } from "@/api/expenses";
import { formatWeight, formatMoney } from "@/units";
import { formatDate } from "@/dates";
import { useTheme } from "@/theme/ThemeContext";
import { themeColors } from "@/theme/palette";

// Tracking hub. Each card carries its section's current figure so the screen says something about
// the pet rather than being four empty links, matching the web hub.
export default function Tracking() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { currentPet } = usePets();
  const { t } = useTranslation();
  const { theme, accent } = useTheme();
  const colors = themeColors(theme, accent);
  const unitSystem = user?.unit_system ?? "metric";
  const walksOn = user?.walk_tracking_enabled ?? false;

  const [weight, setWeight] = useState<string | null>(null);
  const [walk, setWalk] = useState<string | null>(null);
  const [feeding, setFeeding] = useState<string | null>(null);
  const [spend, setSpend] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!currentPet) return;
    const today = new Date().toLocaleDateString("en-CA");

    // Four independent fetches rather than a Promise.all: one tracker failing must not blank the
    // other three cards.
    listRecords(currentPet.id)
      .then((all) => {
        const weighed = all
          .filter((r) => r.record_type === "Weight" && r.weight_kg != null)
          .sort((a, b) => b.date.localeCompare(a.date));
        setWeight(weighed.length === 0 ? null : formatWeight(weighed[0].weight_kg!, unitSystem));
      })
      .catch(() => setWeight(null));

    if (walksOn) {
      listWalks(currentPet.id)
        .then((rows) => {
          // The API returns newest first, so rows[0] is the most recent walk.
          if (rows.length === 0) {
            setWalk(null);
            return;
          }
          setWalk(
            rows[0].date === today
              ? t("tracking.walkedToday")
              : t("tracking.lastWalk", { date: formatDate(rows[0].date) }),
          );
        })
        .catch(() => setWalk(null));
    }

    feedingStatus(currentPet.id)
      .then((slots) => {
        // Slots come back in time order. What is due now beats what is merely upcoming.
        const next = slots.find((s) => s.status === "due") ?? slots.find((s) => s.status === "upcoming");
        setFeeding(next ? t("tracking.nextFeeding", { time: next.time.slice(0, 5) }) : null);
      })
      .catch(() => setFeeding(null));

    getExpenseSummary(currentPet.id, today.slice(0, 7))
      .then((s) => setSpend(t("tracking.spentThisMonth", { amount: formatMoney(s.total, s.currency) })))
      .catch(() => setSpend(null));
  }, [currentPet, unitSystem, walksOn, t]);

  // Tabs stay mounted, so a plain useEffect would run once and never refresh.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const rows = [
    { href: "/tracking/weight", key: "weight", icon: "scale-outline", value: weight, shown: true },
    { href: "/tracking/walks", key: "walks", icon: "footsteps-outline", value: walk, shown: walksOn },
    { href: "/tracking/feeding", key: "feeding", icon: "restaurant-outline", value: feeding, shown: true },
    { href: "/tracking/budget", key: "budget", icon: "wallet-outline", value: spend, shown: true },
  ] as const;

  return (
    <SwipeTabs>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16 }}
      >
        <Text className="mb-6 text-2xl font-bold text-fg">{t("tracking.title")}</Text>

        {rows
          .filter((row) => row.shown)
          .map((row, index) => (
            <Pressable
              key={row.href}
              onPress={() => router.navigate(row.href)}
              className={`flex-row items-start gap-4 rounded-xl border border-border bg-surface p-5 active:opacity-70 ${
                index > 0 ? "mt-4" : ""
              }`}
            >
              <View
                style={{ backgroundColor: `${colors.primary}1A` }}
                className="h-11 w-11 items-center justify-center rounded-lg"
              >
                <Ionicons name={row.icon} size={22} color={colors.primary} />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-lg font-semibold text-fg">{t(`tracking.${row.key}`)}</Text>
                <Text className="mt-0.5 text-sm text-muted">{t(`tracking.${row.key}Hint`)}</Text>
                <Text className="mt-2 text-base font-semibold text-primary">
                  {row.value ?? t("tracking.noData")}
                </Text>
              </View>
            </Pressable>
          ))}
      </ScrollView>
    </SwipeTabs>
  );
}