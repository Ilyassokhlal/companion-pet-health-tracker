import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, KeyboardAvoidingView, Modal, Pressable, ScrollView, Text, View } from "react-native";
import SwipeTabs from "@/components/SwipeTabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";

import Button from "@/components/ui/Button";
import RecordForm from "@/components/RecordForm";
import OfflineBanner from "@/components/ui/OfflineBanner";
import { usePets } from "@/context/PetContext";
import { listRecordsCached, deleteRecord, exportRecords } from "@/api/records";
import { RECORD_TYPES } from "@/types";
import type { HealthRecord, RecordType } from "@/types";
import { formatDate } from "@/dates";
import { useAuth } from "@/auth/AuthContext";
import { formatWeight } from "@/units";
import { errorMessage } from "@/errors";


// Records screen for managing pet health records, including listing, filtering, adding, editing, and deleting records.
export default function Records() {
  const { t } = useTranslation();
  const { currentPet } = usePets();
  const { user } = useAuth();
  const unitSystem = user?.unit_system ?? "metric";
  const insets = useSafeAreaInsets();
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [filter, setFilter] = useState<RecordType | "All">("All");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<HealthRecord | "new" | null>(null);
  const [offlineSince, setOfflineSince] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!currentPet) {
      setRecords([]);
      setOfflineSince(null);
      return;
    }
    setLoading(true);
    listRecordsCached(currentPet.id)
      .then(({ data, savedAt }) => {
        setRecords(data);
        setOfflineSince(savedAt);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentPet]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function confirmDelete(record: HealthRecord) {
    Alert.alert(t("records.confirmDeleteTitle"), t("records.confirmDeleteBody", { title: record.title }), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          await deleteRecord(record.id);
          load();
        },
      },
    ]);
  }

  async function handleExport(format: "zip" | "pdf") {
    if (!currentPet) return;
    try {
      await exportRecords(currentPet.id, format);
    } catch (err) {
      Alert.alert(t("records.exportFailed"), errorMessage(err));
    }
  }

  if (!currentPet) {
    return (
      <View className="flex-1 items-center justify-center bg-ink px-6">
        <Text className="text-center text-muted">{t("common.noPet")}</Text>
      </View>
    );
  }

  const filtered =
    filter === "All" ? records : records.filter((r) => r.record_type === filter);
  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));

  // Each Weight record measured against the previous one by date, so the arrow stays correct. An unchanged weight gets no arrow at all.
  const weightDeltas = new Map<number, number>();
  const weighed = records
    .filter((r) => r.record_type === "Weight" && r.weight_kg != null)
    .sort((a, b) => a.date.localeCompare(b.date));
  weighed.forEach((r, index) => {
    if (index === 0) return;
    const change = r.weight_kg! - weighed[index - 1].weight_kg!;
    if (change !== 0) weightDeltas.set(r.id, change);
  });

  return (
    <SwipeTabs>
    <ScrollView
      className="flex-1 bg-ink"
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16 }}
    >
      <OfflineBanner savedAt={offlineSince} />
      <View className="mb-4 flex-row flex-wrap gap-2">
        <Pressable
          onPress={() => setFilter("All")}
          className={`rounded-lg px-3 py-1.5 ${
            filter === "All" ? "bg-primary" : "border border-border bg-surface"
          }`}
        >
          <Text className="text-sm text-fg">{t("common.all")} ({records.length})</Text>
        </Pressable>
        {RECORD_TYPES.map((type) => (
          <Pressable
            key={type}
            onPress={() => setFilter(type)}
            className={`rounded-lg px-3 py-1.5 ${
              filter === type ? "bg-primary" : "border border-border bg-surface"
            }`}
          >
            <Text className="text-sm text-fg">
              {t(`recordTypes.${type}`)} ({records.filter((r) => r.record_type === type).length})
            </Text>
          </Pressable>
        ))}
      </View>

      <View className="mb-6 gap-2">
        <Button label={t("recordForm.add")} onPress={() => setEditing("new")} />
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button label={t("records.exportData")} variant="secondary" onPress={() => handleExport("zip")} />
          </View>
          <View className="flex-1">
            <Button label={t("records.exportPdf")} variant="secondary" onPress={() => handleExport("pdf")} />
          </View>
        </View>
      </View>

      {loading ? <Text className="text-muted">{t("common.loading")}</Text> : null}

      {!loading && sorted.length === 0 ? (
        <Text className="text-muted">{t("records.empty")}</Text>
      ) : null}

      {sorted.map((r) => (
        <View key={r.id} className="mb-3 rounded-xl border border-border bg-surface p-5">
          <View className="flex-row items-baseline justify-between gap-3">
            <Text numberOfLines={1} className="flex-1 font-semibold text-fg">
              {r.title}
            </Text>
            <Text className="shrink-0 text-sm text-muted">{formatDate(r.date)}</Text>
          </View>

          <Text className="mt-1 text-sm text-primary">{t(`recordTypes.${r.record_type}`)}</Text>

          {r.weight_kg != null ? (
            <Text className="mt-2 text-fg">
              {formatWeight(r.weight_kg, unitSystem)}
              {weightDeltas.has(r.id) ? (
                <Text className="text-sm text-muted">
                  {"  "}{weightDeltas.get(r.id)! > 0 ? "↑" : "↓"} {formatWeight(Math.abs(weightDeltas.get(r.id)!), unitSystem)}
                </Text>
              ) : null}
            </Text>
          ) : null}

          {r.description ? <Text className="mt-2 text-muted">{r.description}</Text> : null}

          {r.next_due_date ? (
            <Text className="mt-2 text-sm text-muted">{t("records.nextDue", { date: formatDate(r.next_due_date) })}</Text>
          ) : null}

          <View className="mt-3 flex-row gap-2">
            <Pressable
              onPress={() => setEditing(r)}
              className="rounded-full bg-primary px-3 py-1.5 active:opacity-70"
            >
              <Text className="text-sm font-medium text-white">{t("common.edit")}</Text>
            </Pressable>
            <Pressable
              onPress={() => confirmDelete(r)}
              className="rounded-full bg-danger px-3 py-1.5 active:opacity-70"
            >
              <Text className="text-sm font-medium text-white">{t("common.delete")}</Text>
            </Pressable>
          </View>
        </View>
      ))}

      <Modal
        visible={editing !== null}
        animationType="slide"
        onRequestClose={() => setEditing(null)}
      >
        <KeyboardAvoidingView behavior="padding" className="flex-1">
          <ScrollView
            className="flex-1 bg-ink"
            contentContainerStyle={{ flexGrow: 1, padding: 16, paddingTop: insets.top + 16 }}
            keyboardShouldPersistTaps="handled"
          >
          <Pressable onPress={() => setEditing(null)} className="flex-1 justify-center">
            <Pressable onPress={() => {}}>
            {editing ? (
              <RecordForm
                key={editing === "new" ? "new" : editing.id}
                petId={currentPet.id}
                record={editing === "new" ? undefined : editing}
                onDone={(saved) => {
                  setEditing(null);
                  if (saved) load();
                }}
              />
            ) : null}
            </Pressable>
          </Pressable>
        </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  </SwipeTabs>
  );
}