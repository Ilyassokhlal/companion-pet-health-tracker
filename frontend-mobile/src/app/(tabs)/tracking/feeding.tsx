import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

import { usePets } from "@/context/PetContext";
import {
  listFeedingTimes, createFeedingTime, deleteFeedingTime,
  listFeedings, createFeeding, deleteFeeding, feedingStatus,
} from "@/api/feeding";
import { AMOUNT_UNITS } from "@/types";
import type { Feeding as FeedingLog, FeedingTime, SlotStatus } from "@/types";
import { formatDate } from "@/dates";
import { useTheme } from "@/theme/ThemeContext";
import { themeColors } from "@/theme/palette";
import { errorMessage } from "@/errors";

const STATUS_CLASS: Record<SlotStatus["status"], string> = {
  met: "text-muted",
  due: "text-warning",
  missed: "text-danger",
  upcoming: "text-muted",
};

// Feeding times snap to 15 minutes, so the picker offers exactly the valid values.
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const MINUTES = [0, 15, 30, 45];

export default function Feeding() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { currentPet } = usePets();
  const { theme, accent } = useTheme();
  const colors = themeColors(theme, accent);

  const [times, setTimes] = useState<FeedingTime[]>([]);
  const [statuses, setStatuses] = useState<SlotStatus[]>([]);
  const [log, setLog] = useState<FeedingLog[]>([]);
  const [pickHour, setPickHour] = useState(8);
  const [pickMinute, setPickMinute] = useState(0);

  const [food, setFood] = useState("");
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState<string>("g");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!currentPet) return;
    try {
      const [t, s, l] = await Promise.all([
        listFeedingTimes(currentPet.id),
        feedingStatus(currentPet.id),
        listFeedings(currentPet.id),
      ]);
      setTimes(t);
      setStatuses(s);
      setLog(l);
    } catch (err) {
      console.error(err);
    }
  }, [currentPet]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const pad = (n: number) => String(n).padStart(2, "0");

  async function addTime() {
    if (!currentPet) return;
    setBusy(true);
    try {
      await createFeedingTime(currentPet.id, `${pad(pickHour)}:${pad(pickMinute)}:00`);
      load();
    } catch (err) {
      Alert.alert(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  // Logs a feeding entry immediately with the current date and time.
  async function logNow() {
    if (!currentPet) return;
    setBusy(true);
    try {
      const now = new Date();
      const typed = amount.trim() === "" ? null : Number(amount);
      await createFeeding(currentPet.id, {
        date: now.toLocaleDateString("en-CA"),
        time: `${pad(now.getHours())}:${pad(now.getMinutes())}:00`,
        food: food.trim() || null,
        amount: typed,
        amount_unit: typed === null ? null : unit,
        notes: notes.trim() || null,
      });
      setFood("");
      setAmount("");
      setNotes("");
      load();
    } catch (err) {
      Alert.alert(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function confirmDeleteLog(entry: FeedingLog) {
    Alert.alert(t("feeding.confirmDeleteTitle"), t("feeding.confirmDeleteBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          await deleteFeeding(entry.id);
          load();
        },
      },
    ]);
  }

  if (!currentPet) {
    return (
      <View className="flex-1 items-center justify-center bg-ink px-6">
        <Text className="text-center text-muted">{t("common.noPet")}</Text>
      </View>
    );
  }

  const chip = "rounded-lg px-3 py-1.5 border border-border";
  const input = "rounded-lg border border-border bg-surface px-4 py-3 text-fg";

  return (
    <ScrollView
      className="flex-1 bg-ink"
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16 }}
    >
      <Text className="mb-1 text-2xl font-bold text-fg">{t("tracking.feeding")}</Text>
      <Text className="mb-6 text-sm text-muted">{currentPet.name}</Text>

      <View className="mb-6 rounded-xl border border-border bg-surface p-5">
        <Text className="mb-3 text-lg font-semibold text-fg">{t("feeding.schedule")}</Text>
        {times.length === 0 ? (
          <Text className="mb-3 text-sm text-muted">
            {t("feeding.noTimes")}
          </Text>
        ) : null}

        {times.map((entry) => {
          const status = statuses.find((s) => s.time === entry.time);
          return (
            <View key={entry.id} className="flex-row items-center justify-between border-t border-border py-3">
              <Text className="text-fg">{entry.time.slice(0, 5)}</Text>
              <View className="flex-row items-center gap-4">
                {status ? (
                  <Text className={`text-sm ${STATUS_CLASS[status.status]}`}>
                    {t(`feeding.status.${status.status}`)}
                  </Text>
                ) : null}
                <Pressable onPress={() => deleteFeedingTime(entry.id).then(load)}>
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </Pressable>
              </View>
            </View>
          );
        })}

        <Text className="mb-2 mt-4 text-sm text-muted">{t("feeding.addTime")}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
          <View className="flex-row gap-2">
            {HOURS.map((h) => (
              <Pressable
                key={h}
                onPress={() => setPickHour(h)}
                className={`${chip} ${pickHour === h ? "bg-primary" : "bg-ink"}`}
              >
                <Text className={`text-sm ${pickHour === h ? "text-on-primary" : "text-muted"}`}>{pad(h)}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
        <View className="mb-3 flex-row gap-2">
          {MINUTES.map((m) => (
            <Pressable
              key={m}
              onPress={() => setPickMinute(m)}
              className={`${chip} ${pickMinute === m ? "bg-primary" : "bg-ink"}`}
            >
              <Text className={`text-sm ${pickMinute === m ? "text-on-primary" : "text-muted"}`}>:{pad(m)}</Text>
            </Pressable>
          ))}
        </View>
        <Pressable
          onPress={addTime}
          disabled={busy}
          className={`items-center rounded-lg bg-primary px-4 py-3 ${busy ? "opacity-50" : "active:opacity-70"}`}
        >
          <Text className="font-semibold text-on-primary">{t("feeding.addAt", { time: `${pad(pickHour)}:${pad(pickMinute)}` })}</Text>
        </Pressable>
      </View>

      <View className="mb-6 rounded-xl border border-border bg-surface p-5">
        <Text className="mb-3 text-lg font-semibold text-fg">{t("feeding.logTitle")}</Text>
        <TextInput placeholder={t("feeding.food")} value={food} onChangeText={setFood} className={`mb-3 ${input}`} />
        <View className="mb-3 flex-row items-center gap-2">
          <TextInput
            placeholder={t("feeding.amount")}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            className={`flex-1 ${input}`}
          />
          {AMOUNT_UNITS.map((u) => (
            <Pressable
              key={u}
              onPress={() => setUnit(u)}
              className={`${chip} ${unit === u ? "bg-primary" : "bg-ink"}`}
            >
              <Text className={`text-xs ${unit === u ? "text-on-primary" : "text-muted"}`}>{u}</Text>
            </Pressable>
          ))}
        </View>
        <TextInput placeholder={t("feeding.notes")} value={notes} onChangeText={setNotes} className={`mb-4 ${input}`} />
        <Pressable
          onPress={logNow}
          disabled={busy}
          className={`items-center rounded-lg bg-primary px-4 py-3 ${busy ? "opacity-50" : "active:opacity-70"}`}
        >
          <Text className="font-semibold text-on-primary">{t("feeding.logNow")}</Text>
        </Pressable>
      </View>

      <Text className="mb-3 text-lg font-semibold text-fg">{t("feeding.history")}</Text>
      {log.length === 0 ? (
        <Text className="text-muted">{t("feeding.empty")}</Text>
      ) : (
        log.map((entry) => (
          <Pressable
            key={entry.id}
            onLongPress={() => confirmDeleteLog(entry)}
            className="mb-3 rounded-xl border border-border bg-surface p-4"
          >
            <Text className="font-semibold text-fg">
              {formatDate(entry.date)} · {entry.time.slice(0, 5)}
            </Text>
            <Text className="mt-1 text-sm text-muted">
              {[entry.food, entry.amount !== null ? `${entry.amount} ${entry.amount_unit ?? ""}`.trim() : null]
                .filter(Boolean)
                .join(" · ") || t("feeding.noDetails")}
            </Text>
            {entry.notes ? <Text className="mt-2 text-sm text-fg">{entry.notes}</Text> : null}
          </Pressable>
        ))
      )}
    </ScrollView>
  );
}