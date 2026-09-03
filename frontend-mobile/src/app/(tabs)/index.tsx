import { useCallback, useState } from "react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Alert, KeyboardAvoidingView, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";

import { usePets } from "@/context/PetContext";
import { listEvents, completeEvent } from "@/api/events";
import { deletePet } from "@/api/pets";
import type { HealthRecord, ScheduledEvent, Walk, SlotStatus, ExpenseSummary } from "@/types";
import PetForm from "@/components/PetForm";
import RecordForm from "@/components/RecordForm";
import EventForm from "@/components/EventForm";
import Button from "@/components/ui/Button";
import { formatDate } from "@/dates";
import SwipeTabs from "@/components/SwipeTabs";
import { listRecords } from "@/api/records";
import { useAuth } from "@/auth/AuthContext";
import { formatMoney, formatWeight } from "@/units";
import { listWalks } from "@/api/walks";
import { feedingStatus } from "@/api/feeding";
import { getExpenseSummary } from "@/api/expenses";
import DashboardHeader from "@/components/DashboardHeader";
import PetPhoto from "@/components/PetPhoto";
import VerifyBanner from "@/components/VerifyBanner";

// Formats a pet's age: days under one month, months under one year, then years.
// t is passed in because a module-level function cannot call the hook, and the plural forms come from i18next.
function formatAge(birthDate: string | null, t: TFunction): string {
  if (!birthDate) return t("dashboard.ageUnknown");
  const birth = new Date(`${birthDate}T00:00:00`);
  const now = new Date();
  let months =
    (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months--;
  if (months < 1) {
    const days = Math.floor((now.getTime() - birth.getTime()) / 86400000);
    return t("dashboard.days", { count: days });
  }
  if (months < 12) return t("dashboard.months", { count: months });
  const years = Math.floor(months / 12);
  return t("dashboard.years", { count: years });
}

function Field({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <View className="mb-4 w-1/2">
      <Text className="text-sm text-muted">{label}</Text>
      <Text className="text-fg">
        {value}
        {hint ? <Text className="text-sm text-muted"> {hint}</Text> : null}
      </Text>
    </View>
  );
}

// Returns the appropriate text color class for a due date based on whether it is overdue, due today, or in the future.
function dueClass(dueDate: string, todayStr: string): string {
  if (dueDate < todayStr) return "text-danger";
  if (dueDate === todayStr) return "text-warning";
  return "text-fg";
}

// A single row in the list of scheduled events, showing the event's title, due date, and a Done button.
function EventRow({
  event,
  todayStr,
  onDone,
}: {
  event: ScheduledEvent;
  todayStr: string;
  onDone: (event: ScheduledEvent) => void;
}) {
  const { t } = useTranslation();
  return (
    <View className="flex-row items-center justify-between gap-3 py-1.5">
      <Text className={`flex-1 ${dueClass(event.due_date, todayStr)}`}>
        {event.due_date < todayStr ? t("dashboard.overdue") : ""}
        {event.title}
        {event.record_type ? ` · ${t(`recordTypes.${event.record_type}`)}` : ""}
        {" — "}
        {formatDate(event.due_date)}
      </Text>
      <Pressable
        onPress={() => onDone(event)}
        className="shrink-0 rounded-full bg-primary px-3 py-1.5 active:opacity-70"
      >
        <Text className="text-sm font-medium text-on-primary">{t("dashboard.done")}</Text>
      </Pressable>
    </View>
  );
}

// A full-screen modal sheet used for displaying forms, such as the pet, record, and scheduling forms.
function FormSheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView
          className="flex-1 bg-ink"
          contentContainerStyle={{ flexGrow: 1, padding: 16, paddingTop: insets.top + 16 }}
          keyboardShouldPersistTaps="handled"
        >
          <Pressable onPress={onClose} className="flex-1 justify-center">
            <Pressable onPress={() => {}}>{children}</Pressable>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function Dashboard() {
  const { t } = useTranslation();
  const { pets, currentPet, setCurrentPet, loading, refresh, addPetOpen, setAddPetOpen } = usePets();
  const { user } = useAuth();
  const unitSystem = user?.unit_system ?? "metric";
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [showForm, setShowForm] = useState<"edit" | null>(null);
  const [events, setEvents] = useState<ScheduledEvent[]>([]);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [editingRecord, setEditingRecord] = useState<HealthRecord | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  // Dismissing a section is deliberately in-memory only. It lasts until the app is relaunched or
  // the user logs in again, which is why it must never be persisted to AsyncStorage.
  const [dueDismissed, setDueDismissed] = useState(false);
  const [scheduledDismissed, setScheduledDismissed] = useState(false);
  const [slots, setSlots] = useState<SlotStatus[]>([]);
  const [walks, setWalks] = useState<Walk[]>([]);

  function openAdd() {
    setShowForm(null);
    setAddPetOpen(true);
  }

  function openEdit() {
    setAddPetOpen(false);
    setShowForm("edit");
  }

  function closeForm() {
    setAddPetOpen(false);
    setShowForm(null);
  }

  const load = useCallback(() => {
    if (!currentPet) {
      setEvents([]);
      setRecords([]);
      setSlots([]);
      setWalks([]);
      setSummary(null);
      return;
    }
    listEvents(currentPet.id).then(setEvents).catch(console.error);
    listRecords(currentPet.id).then(setRecords).catch(console.error);
    if (user?.walk_tracking_enabled && currentPet.walk_tracking_enabled) {
      listWalks(currentPet.id).then(setWalks).catch(console.error);
    } else {
      setWalks([]);
    }
    // No gate — a pet with no feeding times simply returns an empty list.
    feedingStatus(currentPet.id).then(setSlots).catch(console.error);
    // No month argument — the server defaults to today's month in the owner's timezone.
    getExpenseSummary(currentPet.id).then(setSummary).catch(console.error);
  }, [currentPet, user?.walk_tracking_enabled]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Marks an event done. The backend creates the health record it produced and returns it, which
  // opens in the record form for the user to fill in the details.
  async function handleDone(event: ScheduledEvent) {
    try {
      setEditingRecord(await completeEvent(event.id));
    } catch (err) {
      console.error(err);
    }
  }

  function closeRecordForm() {
    setEditingRecord(null);
    load();
  }

  function confirmDelete() {
    if (!currentPet) return;
    Alert.alert(
      t("dashboard.deleteTitle", { name: currentPet.name }),
      t("dashboard.deleteBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            await deletePet(currentPet.id);
            await refresh();
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-muted">{t("common.loading")}</Text>
      </View>
    );
  }

  if (!currentPet) {
    return (
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 16 }}
      >
        {addPetOpen ? (
          <PetForm onDone={() => setAddPetOpen(false)} />
        ) : (
          <>
            <Text className="mb-4 text-center text-muted">{t("dashboard.noPetYet")}</Text>
            <Button label={t("petForm.add")} onPress={() => setAddPetOpen(true)} />
          </>
        )}
      </ScrollView>
    );
  }

  // Follow-ups and weight check-ins are things the pet is due for.
  // Appointments are things the owner scheduled.
  // The server already returns them soonest first with completed ones left out.
  const todayStr = new Date().toLocaleDateString("en-CA");
  const due = events.filter((e) => e.kind !== "Appointment");
  const scheduled = events.filter((e) => e.kind === "Appointment");

  // The newest Weight record against the one before it, for the arrow beside the current weight.
  // Null when there are fewer than two, or when the weight has not moved.
  const weighed = records
    .filter((r) => r.record_type === "Weight" && r.weight_kg != null)
    .sort((a, b) => a.date.localeCompare(b.date));
  let weightChange: number | null = null;
  if (weighed.length >= 2) {
    const change = weighed[weighed.length - 1].weight_kg! - weighed[weighed.length - 2].weight_kg!;
    weightChange = change === 0 ? null : change;
  }

  // Absent rather than empty when the server predates these columns — an older backend returns a pet object without them at all, and calling .length on that is what crashes the screen.
  const dietary = currentPet.dietary_restrictions ?? [];
  const disabilities = currentPet.disabilities ?? [];

  return (
    <SwipeTabs>
    <View className="flex-1">
    <DashboardHeader />
    <VerifyBanner />
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16 }}
    >
      <View className="mb-6">
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingEnd: 88 }}
        >
          {pets.map((pet) => (
            <Pressable
              key={pet.id}
              onPress={() => setCurrentPet(pet)}
              className={`flex-row items-center gap-2 rounded-full py-1.5 ps-1.5 pe-4 ${
                pet.id === currentPet.id ? "bg-primary" : "border border-border bg-surface"
              }`}
            >
              <PetPhoto pet={pet} size="h-7 w-7" textSize="text-xs" interactive={false} />
              <Text className={pet.id === currentPet.id ? "text-on-primary" : "text-fg"}>{pet.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
        {/* Pinned rather than a child of the ScrollView, so the pet chips slide underneath it. insetInlineEnd rather than right.
          It mirrors under RTL, and RN 0.86 supports it. */}
        <Pressable
          onPress={openAdd}
          style={{ position: "absolute", insetInlineEnd: 0, top: 0, bottom: 0 }}
          className="flex-row items-center rounded-full bg-primary px-4 active:opacity-70"
        >
          <Text className="font-medium text-on-primary">{t("dashboard.addChip")}</Text>
        </Pressable>
      </View>

      <View className="flex-row items-center justify-between">
        <PetPhoto pet={currentPet} />
        <Text numberOfLines={1} className="ms-3 flex-1 text-2xl font-bold text-fg">
          {currentPet.name}
        </Text>
        <View className="ms-3 shrink-0 flex-row gap-2">
          <Pressable
            onPress={openEdit}
            className="rounded-full bg-primary px-3 py-1.5 active:opacity-70"
          >
            <Text className="text-sm font-medium text-on-primary">{t("common.edit")}</Text>
          </Pressable>
          <Pressable
            onPress={confirmDelete}
            className="rounded-full bg-danger px-3 py-1.5 active:opacity-70"
          >
            <Text className="text-sm font-medium text-white">{t("common.delete")}</Text>
          </Pressable>
        </View>
      </View>

      <View className="mt-6 flex-row flex-wrap">
        <Field label={t("dashboard.species")} value={currentPet.species} />
        <Field label={t("dashboard.breed")} value={currentPet.breed ?? t("common.notSet")} />
        <Field label={t("dashboard.age")} value={formatAge(currentPet.birth_date, t)} />
        {user?.walk_tracking_enabled && currentPet.walk_tracking_enabled ? (
          <Field label={t("dashboard.walkedToday")} value={walks[0]?.date === todayStr ? t("dashboard.yes") : t("dashboard.notYet")} />
        ) : null}
        {slots.length > 0 ? (
          <Field
            label={t("dashboard.feeding")}
            value={
              slots.some((s) => s.status === "missed")
                ? t("dashboard.missed", { count: slots.filter((s) => s.status === "missed").length })
                : slots.some((s) => s.status === "due")
                  ? t("feeding.status.due")
                  : t("dashboard.onTrack")
            }
          />
        ) : null}
        <Field
          label={t("dashboard.weight")}
          value={currentPet.weight !== null ? formatWeight(currentPet.weight, unitSystem) : t("common.notSet")}
          hint={
            weightChange !== null
              ? `${weightChange > 0 ? "↑" : "↓"} ${formatWeight(Math.abs(weightChange), unitSystem)}`
              : undefined
          }
        />
        {summary && (summary.limit !== null || summary.total > 0) ? (
          <View className="mb-4 w-1/2">
            <Text className="text-sm text-muted">{t("dashboard.spentThisMonth")}</Text>
            <Text
              className={
                summary.status === "over"
                  ? "text-danger"
                  : summary.status === "warning"
                    ? "text-warning"
                    : "text-fg"
              }
            >
              {formatMoney(summary.total, summary.currency)}
              {summary.limit !== null ? (
                <Text className="text-sm text-muted"> {t("budget.of", { limit: formatMoney(summary.limit, summary.currency) })}</Text>
              ) : null}
            </Text>
          </View>
        ) : null}
      </View>

      {dietary.length > 0 || disabilities.length > 0 ? (
        <View className="rounded-xl border border-border bg-surface p-5">
          {dietary.length > 0 ? (
            <View>
              <Text className="mb-2 text-sm text-muted">{t("petForm.dietary")}</Text>
              <View className="flex-row flex-wrap gap-2">
                {dietary.map((item) => (
                  <View key={item} className="rounded-full border border-border bg-ink px-3 py-1">
                    <Text className="text-sm text-fg">{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
          {disabilities.length > 0 ? (
            <View className={dietary.length > 0 ? "mt-4" : ""}>
              <Text className="mb-2 text-sm text-muted">{t("petForm.disabilities")}</Text>
              <View className="flex-row flex-wrap gap-2">
                {disabilities.map((item) => (
                  <View key={item} className="rounded-full border border-border bg-ink px-3 py-1">
                    <Text className="text-sm text-fg">{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      {dueDismissed ? null : (
        <View className="mt-8 rounded-xl border border-border bg-surface p-5">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-fg">{t("dashboard.due")}</Text>
            <Pressable onPress={() => setDueDismissed(true)} className="active:opacity-70">
              <Text className="text-sm text-muted">{t("dashboard.dismiss")}</Text>
            </Pressable>
          </View>
          {due.length === 0 ? (
            <Text className="text-muted">{t("dashboard.nothingDue")}</Text>
          ) : (
            due.map((e) => <EventRow key={e.id} event={e} todayStr={todayStr} onDone={handleDone} />)
          )}
        </View>
      )}

      {scheduledDismissed ? null : (
        <View className="mt-6 rounded-xl border border-border bg-surface p-5">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-lg font-semibold text-fg">{t("dashboard.scheduled")}</Text>
            <View className="flex-row items-center gap-3">
              <Pressable
                onPress={() => setScheduleOpen(true)}
                className="rounded-full bg-primary px-3 py-1.5 active:opacity-70"
              >
                <Text className="text-sm font-medium text-on-primary">{t("dashboard.schedule")}</Text>
              </Pressable>
              <Pressable
                onPress={() => setScheduledDismissed(true)}
                className="active:opacity-70"
              >
                <Text className="text-sm text-muted">{t("dashboard.dismiss")}</Text>
              </Pressable>
            </View>
          </View>
          {scheduled.length === 0 ? (
            <Text className="text-muted">{t("dashboard.nothingScheduled")}</Text>
          ) : (
            scheduled.map((e) => (
              <EventRow key={e.id} event={e} todayStr={todayStr} onDone={handleDone} />
            ))
          )}
        </View>
      )}

      <FormSheet visible={addPetOpen || showForm === "edit"} onClose={closeForm}>
        {showForm === "edit" ? (
          <PetForm key={currentPet.id} pet={currentPet} onDone={closeForm} />
        ) : (
          <PetForm key="add" onDone={closeForm} />
        )}
      </FormSheet>

      <FormSheet visible={editingRecord !== null} onClose={closeRecordForm}>
        {editingRecord ? (
          <RecordForm
            key={editingRecord.id}
            petId={currentPet.id}
            record={editingRecord}
            onDone={closeRecordForm}
          />
        ) : null}
      </FormSheet>

      <FormSheet visible={scheduleOpen} onClose={() => setScheduleOpen(false)}>
        <EventForm
          petId={currentPet.id}
          onDone={(saved) => {
            setScheduleOpen(false);
            if (saved) load();
          }}
        />
      </FormSheet>
    </ScrollView>
    </View>
  </SwipeTabs>
  );
}