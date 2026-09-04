import { useEffect, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";
import Svg, { Polygon, Polyline } from "react-native-svg";

import { BASE_URL } from "@/api/client";
import { listPetPhotos } from "@/api/records";
import type { ExpenseSummary, GalleryPhoto, HealthRecord, Pet, Walk } from "@/types";
import { formatMoney, formatWeight, formatDistance, formatDuration } from "@/units";
import { useTheme } from "@/theme/ThemeContext";
import { themeColors } from "@/theme/palette";
import { Ionicons } from "@expo/vector-icons";

// The four dashboard panels, matching the web ones. Each navigates to the page that owns its data,
// so the dashboard summarises and the section screens do the work.

const CARD = "rounded-xl border border-border bg-surface p-5 active:opacity-70";

// Same status-to-colour mapping the budget screen uses. The server decides the status.
const BAR: Record<string, string> = {
  none: "bg-primary",
  ok: "bg-primary",
  warning: "bg-warning",
  over: "bg-danger",
};

export function SpendPanel({ summary }: { summary: ExpenseSummary }) {
  const { t } = useTranslation();
  return (
    <Pressable onPress={() => router.navigate("/tracking/budget")} className={`mt-4 ${CARD}`}>
      <View className="flex-row flex-wrap items-baseline justify-between gap-2">
        <Text className="text-sm text-muted">{t("dashboard.spentThisMonth")}</Text>
        <Text className={`text-sm ${summary.status === "over" ? "font-semibold text-danger" : "text-muted"}`}>
          {summary.limit === null
            ? t("budget.noLimit")
            : summary.status === "over"
              ? t("budget.exceeded")
              : t("budget.of", { limit: formatMoney(summary.limit, summary.currency) })}
        </Text>
      </View>
      <Text className="mt-1 text-2xl font-bold text-fg">
        {formatMoney(summary.total, summary.currency)}
      </Text>
      {summary.limit !== null ? (
        <View className="mt-3 h-2 w-full overflow-hidden rounded-full bg-ink">
          <View
            className={`h-full ${BAR[summary.status]}`}
            style={{ width: `${Math.min(summary.percent ?? 0, 100)}%` }}
          />
        </View>
      ) : null}
    </Pressable>
  );
}

// react-native-svg, because RN has no SVG of its own and a line cannot be drawn with Views.
// This is the only reason the module was added, and it is why the mobile dashboard needs a build
// rather than an OTA update.
const W = 300;
const H = 300;
const PAD = 24;

export function WeightPanel({ records, unitSystem }: { records: HealthRecord[]; unitSystem: string }) {
  const { t } = useTranslation();
  const { theme, accent } = useTheme();
  const colors = themeColors(theme, accent);

  // Oldest first, and only the last dozen — beyond that the line says nothing at this size.
  const series = records
    .filter((r) => r.record_type === "Weight" && r.weight_kg != null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-12);

  const values = series.map((r) => r.weight_kg!);
  const min = values.length > 0 ? Math.min(...values) : 0;
  const max = values.length > 0 ? Math.max(...values) : 0;

  const points = values.map((value, i) => {
    const x = values.length === 1 ? W / 2 : PAD + (i / (values.length - 1)) * (W - PAD * 2);
    // A flat line has no range to scale against, so it sits in the middle rather than dividing by zero.
    const y = max === min ? H / 2 : H - PAD - ((value - min) / (max - min)) * (H - PAD * 2);
    return { x, y };
  });
  const path = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <Pressable onPress={() => router.navigate("/tracking/weight")} className={`mt-4 ${CARD}`}>
      <View className="flex-row flex-wrap items-baseline justify-between gap-2">
        <Text className="text-sm text-muted">{t("dashboard.weightTrend")}</Text>
        {values.length > 0 ? (
          <Text className="text-sm font-semibold text-fg">
            {formatWeight(values[values.length - 1], unitSystem)}
          </Text>
        ) : null}
      </View>

      {values.length < 2 ? (
        <Text className="mt-3 text-sm text-muted">{t("dashboard.needTwoWeights")}</Text>
      ) : (
        <>
          <View className="mt-3 aspect-square w-full">
            <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none">
              <Polygon
                points={`${points[0].x},${H} ${path} ${points[points.length - 1].x},${H}`}
                fill={colors.primary}
                fillOpacity={0.12}
              />
              <Polyline
                points={path}
                fill="none"
                stroke={colors.primary}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </Svg>
          </View>
          <View className="mt-1 flex-row justify-between">
            <Text className="text-xs text-muted">{formatWeight(min, unitSystem)}</Text>
            <Text className="text-xs text-muted">{formatWeight(max, unitSystem)}</Text>
          </View>
        </>
      )}
    </Pressable>
  );
}

export function ExercisePanel({ walks, unitSystem }: { walks: Walk[]; unitSystem: string }) {
  const { t } = useTranslation();

  // The last seven days, oldest first, so today is the rightmost bar.
  const days: { key: string; minutes: number }[] = [];
  for (let back = 6; back >= 0; back--) {
    const day = new Date();
    day.setDate(day.getDate() - back);
    const key = day.toLocaleDateString("en-CA");
    const minutes = walks
      .filter((w) => w.date === key)
      .reduce((sum, w) => sum + w.duration_minutes, 0);
    days.push({ key, minutes });
  }

  const totalMinutes = days.reduce((sum, d) => sum + d.minutes, 0);
  const totalKm = walks
    .filter((w) => days.some((d) => d.key === w.date))
    .reduce((sum, w) => sum + (w.distance_km ?? 0), 0);
  const peak = Math.max(...days.map((d) => d.minutes), 1);

  return (
    <Pressable onPress={() => router.navigate("/tracking/walks")} className={`mt-4 ${CARD}`}>
      <Text className="text-sm text-muted">{t("dashboard.exercise")}</Text>

      {totalMinutes === 0 ? (
        <Text className="mt-3 text-sm text-muted">{t("dashboard.noWalksWeek")}</Text>
      ) : (
        <>
          <View className="mt-1 flex-row flex-wrap items-baseline gap-x-3">
            <Text className="text-2xl font-bold text-fg">{formatDuration(totalMinutes)}</Text>
            {totalKm > 0 ? (
              <Text className="text-sm text-muted">{formatDistance(totalKm, unitSystem)}</Text>
            ) : null}
          </View>
          <View className="mt-3 h-16 flex-row items-end gap-1.5">
            {days.map((day) => (
              <View key={day.key} className="flex-1">
                <View
                  className={`w-full rounded-t ${day.minutes > 0 ? "bg-primary" : "bg-ink"}`}
                  // A logged day never renders as a hairline, so "some" is always visibly more than "none".
                  style={{ height: day.minutes > 0 ? Math.max((day.minutes / peak) * 64, 6) : 3 }}
                />
              </View>
            ))}
          </View>
        </>
      )}
    </Pressable>
  );
}

export function PhotoPanel({ petId }: { petId: number }) {
  const { t } = useTranslation();
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
    listPetPhotos(petId).then(setPhotos).catch(() => setPhotos([]));
  }, [petId]);

  useEffect(() => {
    if (photos.length < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % photos.length), 4000);
    return () => clearInterval(timer);
  }, [photos.length]);

  return (
    <Pressable onPress={() => router.navigate("/photos")} className={`mt-4 ${CARD}`}>
      <View className="flex-row flex-wrap items-baseline justify-between gap-2">
        <Text className="text-sm text-muted">{t("nav.photos")}</Text>
        {photos.length > 0 ? <Text className="text-sm text-muted">{photos.length}</Text> : null}
      </View>

      {photos.length === 0 ? (
        <Text className="mt-3 text-sm text-muted">{t("dashboard.noPhotos")}</Text>
      ) : (
        <View className="mt-3 aspect-square overflow-hidden rounded-lg bg-ink">
          <Image
            source={{ uri: `${BASE_URL}/photos/${photos[index].filename}` }}
            resizeMode="cover"
            style={{ width: "100%", height: "100%" }}
          />
        </View>
      )}
    </Pressable>
  );
}

// PetBadges component displays badges for a pet's sex, disabilities, and dietary restrictions.
export function PetBadges({ pet }: { pet: Pet }) {
  const { t } = useTranslation();
  const { theme, accent } = useTheme();
  const colors = themeColors(theme, accent);

  return (
    <View className="w-full flex-row flex-wrap gap-2">
      {pet.sex ? (
        <View className="flex-row items-center gap-1.5 rounded-full border border-border bg-ink px-3 py-1">
          <Ionicons name={pet.sex === "male" ? "male" : "female"} size={13} color={colors.muted} />
          <Text className="text-sm text-fg">
            {t(`petForm.${pet.sex}`)}
            {pet.neutered ? ` · ${pet.sex === "male" ? t("petForm.neutered") : t("petForm.spayed")}` : ""}
          </Text>
        </View>
      ) : null}
      {pet.disabilities.length > 0 ? (
        // Amber, not red — red is reserved for delete. Eight-digit hex because mobile cannot use Tailwind opacity modifiers when vars() supplies the colour.
        <View
          style={{ borderColor: `${colors.warning}66`, backgroundColor: `${colors.warning}1A` }}
          className="flex-row items-center gap-1.5 rounded-full border px-3 py-1"
        >
          <Ionicons name="accessibility" size={13} color={colors.warning} />
          <Text className="text-sm text-warning">{pet.disabilities.join(", ")}</Text>
        </View>
      ) : null}
      {pet.dietary_restrictions.length > 0 ? (
        <View className="flex-row items-center gap-1.5 rounded-full border border-border bg-ink px-3 py-1">
          <Ionicons name="restaurant-outline" size={13} color={colors.muted} />
          <Text className="text-sm text-fg">{pet.dietary_restrictions.join(", ")}</Text>
        </View>
      ) : null}
    </View>
  );
}