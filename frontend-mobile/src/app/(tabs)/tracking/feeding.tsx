import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
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
import DateField from "@/components/ui/DateField";
import Button from "@/components/ui/Button";

const STATUS_CLASS: Record<SlotStatus["status"], string> = {
  met: "text-muted",
  due: "text-warning",
  missed: "text-danger",
  upcoming: "text-muted",
};

// Feeding times snap to 15 minutes, so the picker offers exactly the valid values.
const HOURS = Array.from({ length: 24 }, (_, h) => h);
const MINUTES = [0, 15, 30, 45];

const pad = (n: number) => String(n).padStart(2, "0");

// Both actions go through a button that opens a form, matching the budget screen. Logging also takes
// a date and a time now — it used to stamp the current moment with no way to correct it.
export default function Feeding() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { currentPet } = usePets();
  const { theme, accent } = useTheme();
  const colors = themeColors(theme, accent);

  const [times, setTimes] = useState<FeedingTime[]>([]);
  const [statuses, setStatuses] = useState<SlotStatus[]>([]);
  const [log, setLog] = useState<FeedingLog[]>([]);
  const [busy, setBusy] = useState(false);

  const [timeOpen, setTimeOpen] = useState(false);
  const [pickHour, setPickHour] = useState(8);
  const [pickMinute, setPickMinute] = useState(0);

  const [logOpen, setLogOpen] = useState(false);
  const [date, setDate] = useState("");
  const [logHour, setLogHour] = useState(8);
  const [logMinute, setLogMinute] = useState(0);
  const [food, setFood] = useState("");
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState<string>("g");
  const [notes, setNotes] = useState("");

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

  function openTime() {
    setPickHour(8);
    setPickMinute(0);
    setTimeOpen(true);
  }

  // Opens the log form on the current date and the nearest quarter hour, which is almost always what
  // is wanted and still leaves both editable.
  function openLog() {
    const now = new Date();
    setDate(now.toLocaleDateString("en-CA"));
    setLogHour(now.getHours());
    setLogMinute(Math.floor(now.getMinutes() / 15) * 15);
    setFood("");
    setAmount("");
    setUnit("g");
    setNotes("");
    setLogOpen(true);
  }

  async function addTime() {
    if (!currentPet) return;
    setBusy(true);
    try {
      await createFeedingTime(currentPet.id, `${pad(pickHour)}:${pad(pickMinute)}:00`);
      setTimeOpen(false);
      load();
    } catch (err) {
      Alert.alert(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function addFeeding() {
    if (!currentPet) return;
    setBusy(true);
    try {
      const typed = amount.trim() === "" ? null : Number(amount);
      await createFeeding(currentPet.id, {
        date,
        time: `${pad(logHour)}:${pad(logMinute)}:00`,
        food: food.trim() || null,
        amount: typed,
        amount_unit: typed === null ? null : unit,
        notes: notes.trim() || null,
      });
      setLogOpen(false);
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
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-center text-muted">{t("common.noPet")}</Text>
      </View>
    );
  }

  const chip = "rounded-lg px-3 py-1.5 border border-border";
  const input = "rounded-lg border border-border bg-surface px-4 py-3 text-fg";

  return (
    <View className="flex-1">
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16 }}>
        <Text className="mb-6 text-2xl font-bold text-fg">{t("tracking.feeding")}</Text>

        <View className="mb-6">
          <Button label={t("feeding.logTitle")} onPress={openLog} />
        </View>

        <View className="mb-6 rounded-xl border border-border bg-surface p-5">
          <View className="mb-3 flex-row items-center justify-between gap-3">
            <Text className="text-lg font-semibold text-fg">{t("feeding.schedule")}</Text>
            <Pressable
              onPress={openTime}
              className="flex-row items-center gap-1 rounded-lg border border-border px-3 py-1.5 active:opacity-70"
            >
              <Ionicons name="add" size={16} color={colors.primary} />
              <Text className="text-sm font-medium text-primary">{t("feeding.addTime")}</Text>
            </Pressable>
          </View>

          {times.length === 0 ? (
            <Text className="text-sm text-muted">
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

      <Modal visible={timeOpen} animationType="slide" transparent onRequestClose={() => setTimeOpen(false)}>
        <View className="flex-1 justify-end bg-black/70">
          <View className="max-h-[88%] rounded-t-2xl border-t border-border bg-ink p-5">
            <ScrollView>
              <Text className="mb-4 text-lg font-semibold text-fg">{t("feeding.addTime")}</Text>

              <Text className="mb-2 text-sm text-muted">{t("feeding.time")}</Text>
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

              <Text className="mb-4 text-sm text-muted">{t("feeding.noTimes")}</Text>

              <View className="gap-2">
                <Button
                  label={t("feeding.addAt", { time: `${pad(pickHour)}:${pad(pickMinute)}` })}
                  onPress={addTime}
                  loading={busy}
                />
                <Button label={t("common.cancel")} variant="secondary" onPress={() => setTimeOpen(false)} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={logOpen} animationType="slide" transparent onRequestClose={() => setLogOpen(false)}>
        <View className="flex-1 justify-end bg-black/70">
          <View className="max-h-[88%] rounded-t-2xl border-t border-border bg-ink p-5">
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text className="mb-4 text-lg font-semibold text-fg">{t("feeding.logTitle")}</Text>

              <View className="mb-3">
                <DateField label={t("common.date")} value={date} onChange={setDate} maximumDate={new Date()} />
              </View>

              <Text className="mb-2 text-sm text-muted">{t("feeding.time")}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-2">
                <View className="flex-row gap-2">
                  {HOURS.map((h) => (
                    <Pressable
                      key={h}
                      onPress={() => setLogHour(h)}
                      className={`${chip} ${logHour === h ? "bg-primary" : "bg-ink"}`}
                    >
                      <Text className={`text-sm ${logHour === h ? "text-on-primary" : "text-muted"}`}>{pad(h)}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
              <View className="mb-3 flex-row gap-2">
                {MINUTES.map((m) => (
                  <Pressable
                    key={m}
                    onPress={() => setLogMinute(m)}
                    className={`${chip} ${logMinute === m ? "bg-primary" : "bg-ink"}`}
                  >
                    <Text className={`text-sm ${logMinute === m ? "text-on-primary" : "text-muted"}`}>:{pad(m)}</Text>
                  </Pressable>
                ))}
              </View>

              <Text className="mb-1 text-sm text-muted">{t("feeding.food")}</Text>
              <TextInput value={food} onChangeText={setFood} className={`mb-3 ${input}`} />

              <Text className="mb-1 text-sm text-muted">{t("feeding.amount")}</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                className={`mb-3 ${input}`}
              />

              <Text className="mb-2 text-sm text-muted">{t("feeding.unit")}</Text>
              <View className="mb-3 flex-row gap-2">
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

              <Text className="mb-1 text-sm text-muted">{t("feeding.notes")}</Text>
              <TextInput value={notes} onChangeText={setNotes} className={`mb-4 ${input}`} />

              <View className="gap-2">
                <Button label={t("feeding.logButton")} onPress={addFeeding} loading={busy} />
                <Button label={t("common.cancel")} variant="secondary" onPress={() => setLogOpen(false)} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}