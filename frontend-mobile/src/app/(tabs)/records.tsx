import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useDialog } from "@/components/ui/DialogProvider";
import SwipeTabs from "@/components/SwipeTabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Button from "@/components/ui/Button";
import RecordForm from "@/components/RecordForm";
import OfflineBanner from "@/components/ui/OfflineBanner";
import { usePets } from "@/context/PetContext";
import { listRecords, listRecordsCached, deleteRecord, exportRecords, recordCounts } from "@/api/records";
import type { TypeCounts } from "@/api/records";
import { RECORD_TYPES } from "@/types";
import type { HealthRecord, RecordType } from "@/types";
import { formatDate } from "@/dates";
import { useAuth } from "@/auth/AuthContext";
import { formatWeight } from "@/units";
import { errorMessage } from "@/errors";
import EmptyState from "@/components/EmptyState";
import { useLockedRedirect } from "@/premium";
import { useLoadOnScroll, usePaged, useRefreshOnFocus } from "@/paging";

// Records loaded per page as the list scrolls
const PAGE = 20;

// Records screen for managing pet health records, including listing, filtering, adding, editing, and deleting records.
// The list loads a page at a time as it scrolls, and the filter and its counts come from the server, so they cover records not loaded yet.
export default function Records() {
  const { t } = useTranslation();
  const { confirm, notice } = useDialog();
  const { currentPet } = usePets();
  const { user } = useAuth();
  const unitSystem = user?.unit_system ?? "metric";
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<RecordType | "All">("All");
  const [counts, setCounts] = useState<TypeCounts>({});
  const [editing, setEditing] = useState<HealthRecord | "new" | null>(null);
  // A locked account is sent to the subscribe screen instead of the record form
  const closeEditor = useCallback(() => setEditing(null), []);
  const showEditor = useLockedRedirect(editing !== null, closeEditor);
  const [offlineSince, setOfflineSince] = useState<string | null>(null);

  // A new filter or pet makes a new fetcher, which starts the list again from its first page.
  // The start of the full list is also kept on the phone, so the screen still shows something offline.
  const fetchPage = useMemo(
    () =>
      currentPet
        ? async (offset: number, limit: number) => {
            if (filter === "All" && offset === 0) {
              const { data, savedAt } = await listRecordsCached(currentPet.id, { limit });
              setOfflineSince(savedAt);
              return data;
            }
            return listRecords(currentPet.id, { types: filter === "All" ? undefined : [filter], limit, offset });
          }
        : null,
    [currentPet, filter],
  );
  const { items: records, loading, loadingMore, loadMore, refresh } = usePaged(fetchPage, PAGE);
  const scrollProps = useLoadOnScroll(loadMore);

  const loadCounts = useCallback(() => {
    if (!currentPet) return;
    recordCounts(currentPet.id).then(setCounts).catch(console.error);
  }, [currentPet]);

  useEffect(() => {
    loadCounts();
  }, [loadCounts]);

  // An add, edit or delete changes the counts as well as the list, and so can a change made on another screen
  const changed = useCallback(() => {
    refresh();
    loadCounts();
  }, [refresh, loadCounts]);
  useRefreshOnFocus(changed);

  async function confirmDelete(record: HealthRecord) {
    const ok = await confirm({
      title: t("records.confirmDeleteTitle"),
      message: t("records.confirmDeleteBody", { title: record.title }),
      confirmLabel: t("common.delete"),
      destructive: true,
    });
    if (!ok) return;
    await deleteRecord(record.id);
    changed();
  }

  async function handleExport(format: "zip" | "pdf") {
    if (!currentPet) return;
    try {
      await exportRecords(currentPet.id, format);
    } catch (err) {
      notice(t("records.exportFailed"), errorMessage(err));
    }
  }

  if (!currentPet) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-center text-muted">{t("common.noPet")}</Text>
      </View>
    );
  }

  const total = Object.values(counts).reduce((sum, count) => sum + (count ?? 0), 0);

  // Each Weight record measured against the previous one by date, among those loaded so far, so the arrow stays correct. An unchanged weight gets no arrow at all.
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
      className="flex-1"
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16 }}
      {...scrollProps}
    >
      <Text className="mb-6 text-2xl font-bold text-fg">{t("nav.records")}</Text>
      <OfflineBanner savedAt={offlineSince} />
      <View className="mb-4 flex-row flex-wrap gap-2">
        <Pressable
          onPress={() => setFilter("All")}
          className={`rounded-lg px-3 py-1.5 ${
            filter === "All" ? "bg-primary" : "border border-border bg-surface"
          }`}
        >
          <Text className={`text-sm ${filter === "All" ? "text-on-primary" : "text-fg"}`}>{t("common.all")} ({total})</Text>
        </Pressable>
        {RECORD_TYPES.map((type) => (
          <Pressable
            key={type}
            onPress={() => setFilter(type)}
            className={`rounded-lg px-3 py-1.5 ${
              filter === type ? "bg-primary" : "border border-border bg-surface"
            }`}
          >
            <Text className={`text-sm ${filter === type ? "text-on-primary" : "text-fg"}`}>
              {t(`recordTypes.${type}`)} ({counts[type] ?? 0})
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

      {!loading && records.length === 0 ? (
        <EmptyState icon="document-text-outline" text={t("records.empty")} hint={t("records.emptyHint")} />
      ) : null}

      {/* The server sends them newest first, so they are shown in the order they arrive */}
      {records.map((r) => (
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
              <Text className="text-sm font-medium text-on-primary">{t("common.edit")}</Text>
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

      {loadingMore ? <Text className="py-4 text-center text-sm text-muted">{t("common.loading")}</Text> : null}

      <Modal
        visible={showEditor}
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
                  if (saved) changed();
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