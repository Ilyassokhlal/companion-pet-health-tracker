import { useCallback, useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/auth/AuthContext";
import { gettingStarted, readTrackers, updateMe } from "@/api/auth";
import type { GettingStarted } from "@/types";
import { useTheme } from "@/theme/ThemeContext";
import { themeColors } from "@/theme/palette";
import FormModal from "@/components/ui/FormModal";
import Button from "@/components/ui/Button";

// The steps in the order they are shown. The pet is first and always done here, since the dashboard only shows the card once there is one.
const STEPS = ["pet", "record", "photo", "question", "appointment", "tracking"] as const;
type Step = (typeof STEPS)[number];

// The four trackers the introduction walks through, each opening its screen
const TRACKERS = [
  { href: "/tracking/weight", key: "weight", icon: "scale-outline" },
  { href: "/tracking/walks", key: "walks", icon: "footsteps-outline" },
  { href: "/tracking/feeding", key: "feeding", icon: "restaurant-outline" },
  { href: "/tracking/budget", key: "budget", icon: "wallet-outline" },
] as const;

// The dashboard's Get started card for a new account. The server records each step the moment it happens, on any pet and from any device,
// and a step stays done once it is. When the last one is done the card turns into a short All set line, and closing that, or Hide, hides it.
// Settings can bring it back. The dashboard opens its own record and schedule sheets, and raises refreshKey after either saves.
export default function GetStarted({
  refreshKey,
  onAddRecord,
  onSchedule,
}: {
  refreshKey: number;
  onAddRecord: () => void;
  onSchedule: () => void;
}) {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const { theme, accent } = useTheme();
  const colors = themeColors(theme, accent);
  const [done, setDone] = useState<GettingStarted | null>(null);
  const [trackersOpen, setTrackersOpen] = useState(false);
  // A locked account can't add anything, so it is not asked to
  const showing = Boolean(user && !user.onboarding_hidden && user.access !== "locked");

  const load = useCallback(() => {
    if (!showing) return;
    gettingStarted().then(setDone).catch(console.error);
  }, [showing]);

  // Coming back to the dashboard loads the steps again, since a question is asked on the Chat tab
  useFocusEffect(load);

  useEffect(() => {
    if (refreshKey > 0) load();
  }, [refreshKey, load]);

  // Closing the introduction or opening one of its trackers both count as reading it
  const closeTrackers = useCallback(() => {
    setTrackersOpen(false);
    readTrackers().then(load).catch(console.error);
  }, [load]);

  if (!showing || !done) return null;
  const count = STEPS.filter((step) => done[step]).length;

  async function hide() {
    try {
      await updateMe({ onboarding_hidden: true });
      await refreshUser();
    } catch (err) {
      console.error(err);
    }
  }

  if (count === STEPS.length) {
    return (
      <View className="mb-4 flex-row items-center gap-3 rounded-xl border border-border bg-surface p-5">
        <Ionicons name="checkmark-circle" size={26} color={colors.primary} />
        <View className="min-w-0 flex-1">
          <Text className="font-semibold text-fg">{t("onboarding.allSetTitle")}</Text>
          <Text className="text-sm text-muted">{t("onboarding.allSetBody")}</Text>
        </View>
        <Pressable onPress={hide} className="shrink-0 rounded-full border border-border px-3 py-1.5 active:opacity-70">
          <Text className="text-sm font-medium text-fg">{t("common.close")}</Text>
        </Pressable>
      </View>
    );
  }

  function act(step: Step) {
    if (step === "question") router.navigate("/chat");
    // A photo is attached to a record, so both steps open the record form, which takes photos
    else if (step === "record" || step === "photo") onAddRecord();
    else if (step === "appointment") onSchedule();
    else if (step === "tracking") setTrackersOpen(true);
  }

  return (
    <View className="mb-4 rounded-xl border border-border bg-surface p-5">
      <View className="mb-2 flex-row items-center justify-between">
        <Text className="flex-1 text-lg font-semibold text-fg">{t("onboarding.title")}</Text>
        <Pressable onPress={hide} className="active:opacity-70">
          <Text className="text-sm text-muted">{t("onboarding.hide")}</Text>
        </Pressable>
      </View>

      {STEPS.map((step, index) => (
        <View
          key={step}
          className={`min-h-12 flex-row items-center justify-between gap-3 py-2 ${index > 0 ? "border-t border-border" : ""}`}
        >
          <View className="flex-1 flex-row items-center gap-3">
            <Ionicons
              name={done[step] ? "checkmark-circle" : "ellipse-outline"}
              size={22}
              color={done[step] ? colors.primary : colors.muted}
            />
            <Text className={`flex-1 ${done[step] ? "text-muted" : "text-fg"}`}>{t(`onboarding.steps.${step}`)}</Text>
          </View>
          {!done[step] && step !== "pet" ? (
            <Pressable onPress={() => act(step)} className="shrink-0 rounded-full bg-primary px-3 py-1.5 active:opacity-70">
              <Text className="text-sm font-medium text-on-primary">{t(`onboarding.actions.${step}`)}</Text>
            </Pressable>
          ) : null}
        </View>
      ))}

      <View className="mt-3 flex-row items-center gap-3">
        <View className="h-2 flex-1 overflow-hidden rounded-full bg-ink">
          <View className="h-full rounded-full bg-primary" style={{ width: `${(count / STEPS.length) * 100}%` }} />
        </View>
        <Text className="text-sm text-muted">{t("onboarding.progress", { done: count, total: STEPS.length })}</Text>
      </View>

      <FormModal visible={trackersOpen} onClose={closeTrackers}>
        <Text className="mb-2 text-lg font-semibold text-fg">{t("onboarding.trackersTitle")}</Text>
        <Text className="mb-5 text-muted">{t("onboarding.trackersIntro")}</Text>
        {TRACKERS.map((tracker) => (
          <Pressable
            key={tracker.key}
            onPress={() => {
              closeTrackers();
              router.navigate(tracker.href);
            }}
            className="mb-4 flex-row items-start gap-4 active:opacity-70"
          >
            <View
              style={{ backgroundColor: `${colors.primary}1A` }}
              className="h-10 w-10 items-center justify-center rounded-lg"
            >
              <Ionicons name={tracker.icon} size={20} color={colors.primary} />
            </View>
            <View className="min-w-0 flex-1">
              <Text className="font-semibold text-fg">{t(`tracking.${tracker.key}`)}</Text>
              <Text className="text-sm text-muted">{t(`onboarding.trackers.${tracker.key}`)}</Text>
            </View>
          </Pressable>
        ))}
        <Button label={t("onboarding.gotIt")} onPress={closeTrackers} />
      </FormModal>
    </View>
  );
}
