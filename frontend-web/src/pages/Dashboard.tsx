import { usePets } from "../context/PetContext";
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { listEvents, completeEvent } from "../api/events";
import { listRecords } from "../api/records";
import { useAuth } from "../auth/AuthContext";
import { formatWeight } from "../units";
import type { HealthRecord, ScheduledEvent } from "../types";
import PetForm from "../components/PetForm";
import RecordForm from "../components/RecordForm";
import EventForm from "../components/EventForm";
import Modal from "../components/ui/Modal";
import { deletePet } from "../api/pets";
import { Pencil, Trash2, Check, CalendarPlus } from "lucide-react";
import PetPhoto from "../components/PetPhoto";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { formatDate } from "../dates";
import { listWalks } from "../api/walks";
import type { Walk } from "../types";
import { getExpenseSummary } from "../api/expenses";
import type { ExpenseSummary } from "../types";
import { SpendPanel, WeightPanel, ExercisePanel, PhotoPanel } from "../components/DashboardPanels";

// Formats a pet's age: returns "Unknown" if birth date is not provided, days if under one month, months if under one year, and years otherwise.
// Takes t as an argument because a module-level function cannot call the hook, and the plural forms come from i18next rather than a ternary.
function formatAge(birthDate: string | null, t: TFunction): string {
    if (!birthDate) {
        return t("dashboard.ageUnknown");
    }
    const birth = new Date(`${birthDate}T00:00:00`);
    const now = new Date();
    let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    if (now.getDate() < birth.getDate()) {
        months--;
    }
    if (months < 1) {
        const days = Math.floor((now.getTime() - birth.getTime()) / 86400000);
        return t("dashboard.days", { count: days });
    }
    if (months < 12) {
        return t("dashboard.months", { count: months });
    }
    const years = Math.floor(months / 12);
    return t("dashboard.years", { count: years });
}

// Returns a CSS class for a due date: red if overdue, yellow if due today, default otherwise.
function dueClass(dueDate: string, todayStr: string): string {
  if (dueDate < todayStr) return "text-danger";
  if (dueDate === todayStr) return "text-warning";
  return "";
}

// Renders a single scheduled event row with its title, due date, and a Done button. Highlights overdue and due-today events. Calls onDone when the event is marked as done.
function EventRow({ event, todayStr, onDone }: { event: ScheduledEvent; todayStr: string; onDone: (event: ScheduledEvent) => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-1.5">
      <p className={dueClass(event.due_date, todayStr)}>
        {event.due_date < todayStr && t("dashboard.overdue")}
        {event.title}
        {event.record_type && <span className="text-muted"> · {t(`recordTypes.${event.record_type}`)}</span>}
        {" — "}
        {formatDate(event.due_date)}
      </p>
      <Button variant="secondary" onClick={() => onDone(event)} className="inline-flex items-center gap-2">
        <Check size={16} />
        {t("dashboard.done")}
      </Button>
    </div>
  );
}

// The Dashboard component manages the display and interaction with the current pet's information, scheduled events, and health records. It handles loading state, adding a new pet, completing events, and deleting the current pet.
export default function Dashboard() {
  const { t } = useTranslation();
  const { currentPet, loading, refresh, addPetOpen, setAddPetOpen } = usePets();
  const { user } = useAuth();
  const unitSystem = user?.unit_system ?? "metric";
  const [showForm, setShowForm] = useState<"edit" | null>(null);
  const [events, setEvents] = useState<ScheduledEvent[]>([]);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [editingRecord, setEditingRecord] = useState<HealthRecord | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [walks, setWalks] = useState<Walk[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);

  // Loads the current pet's upcoming scheduled events. Kept as a callback so it can be re-run after an event is completed or a new one is scheduled.
  const loadEvents = useCallback(() => {
    if (!currentPet) {
      setEvents([]);
      return;
    }
    listEvents(currentPet.id).then(setEvents).catch(console.error);
  }, [currentPet]);

  useEffect(loadEvents, [loadEvents]);

  // The pet's records, needed for the weight arrow and the trend chart.
  const loadRecords = useCallback(() => {
    if (!currentPet) {
      setRecords([]);
      return;
    }
    listRecords(currentPet.id).then(setRecords).catch(console.error);
  }, [currentPet]);

  useEffect(loadRecords, [loadRecords]);

  // Loads the pet's walks if both the user and the pet have walk tracking enabled.
  // The walks are only relevant if both the user and the pet have walk tracking enabled.
  const loadWalks = useCallback(() => {
    if (!currentPet || !user?.walk_tracking_enabled || !currentPet.walk_tracking_enabled) {
      setWalks([]);
      return;
    }
    listWalks(currentPet.id).then(setWalks).catch(console.error);
  }, [currentPet, user?.walk_tracking_enabled]);

  useEffect(loadWalks, [loadWalks]);

  // Loads the current pet's expense summary for the current month. This is used to display the pet's spending status on the dashboard.
  const loadSummary = useCallback(() => {
    if (!currentPet) {
      setSummary(null);
      return;
    }
    getExpenseSummary(currentPet.id).then(setSummary).catch(console.error);
  }, [currentPet]);

  useEffect(loadSummary, [loadSummary]);

  // Ends an event by marking it done and opening the resulting health record for editing.
  async function handleDone(event: ScheduledEvent) {
    try {
      setEditingRecord(await completeEvent(event.id));
    } catch (err) {
      console.error(err);
    }
  }

  // Closes the health record form and reloads the pet's events.
  function closeRecordForm() {
    setEditingRecord(null);
    loadEvents();
    loadRecords();
  }

  // Deletes the current pet after confirmation.
  async function handleDelete() {
    if (!currentPet) return;
    setConfirmingDelete(false);
    await deletePet(currentPet.id);
    localStorage.removeItem("currentPetId");
    await refresh();
  }

  if (loading) {
    return <div className="p-8">{t("common.loading")}</div>;
  }
  if (!currentPet) {
    return (
    <div className="p-4 sm:p-8">
        <p className="text-muted">{t("dashboard.noPetYet")}</p>
        <Button onClick={() => setAddPetOpen(true)} className="mt-4">
          {t("dashboard.addPet")}
        </Button>
        <Modal open={addPetOpen} title={t("dashboard.addPetTitle")} onClose={() => setAddPetOpen(false)}>
          <PetForm onDone={() => setAddPetOpen(false)} />
        </Modal>
      </div>
    );
  }

// Splits the pet's events by type: due events (follow-ups and weight check-ins) and scheduled appointments.
  const todayStr = new Date().toLocaleDateString("en-CA");
  const due = events.filter(e => e.kind !== "Appointment");
  const scheduled = events.filter(e => e.kind === "Appointment");
  const walksOn = Boolean(user?.walk_tracking_enabled && currentPet.walk_tracking_enabled);

  // The newest Weight record against the one before it, for the arrow beside the current weight. Null when there are fewer than two, or when the weight has not moved.
  const weighed = records
    .filter((r) => r.record_type === "Weight" && r.weight_kg != null)
    .sort((a, b) => a.date.localeCompare(b.date));
  let weightChange: number | null = null;
  if (weighed.length >= 2) {
    const change = weighed[weighed.length - 1].weight_kg! - weighed[weighed.length - 2].weight_kg!;
    weightChange = change === 0 ? null : change;
  }

  return (
    <div className="p-4 sm:p-8">
      {/* The identity card. Spending and walked-today used to live in the facts grid below and made it
          grow from four cells to six as trackers were switched on; both now have their own panel. */}
      <div className="rounded-xl border border-border bg-surface p-6 shadow-soft">
        <div className="flex flex-wrap items-center gap-4">
          <PetPhoto pet={currentPet} />
          <h1 className="text-2xl font-bold">{currentPet.name}</h1>
          <div className="flex gap-2">
            <Button onClick={() => setShowForm("edit")} className="inline-flex items-center gap-2">
              <Pencil size={16} />
              {t("common.edit")}
            </Button>
            <Button variant="danger" onClick={() => setConfirmingDelete(true)} className="inline-flex items-center gap-2">
              <Trash2 size={16} />
              {t("common.delete")}
            </Button>
          </div>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div><dt className="text-sm text-muted">{t("dashboard.species")}</dt><dd>{currentPet.species}</dd></div>
          <div><dt className="text-sm text-muted">{t("dashboard.breed")}</dt><dd>{currentPet.breed ?? t("dashboard.notSet")}</dd></div>
          <div><dt className="text-sm text-muted">{t("dashboard.age")}</dt><dd>{formatAge(currentPet.birth_date, t)}</dd></div>
          {currentPet.sex && (
            <div>
              <dt className="text-sm text-muted">{t("petForm.sex")}</dt>
              <dd>
                {t(`petForm.${currentPet.sex}`)}
                {currentPet.neutered && ` · ${currentPet.sex === "male" ? t("petForm.neutered") : t("petForm.spayed")}`}
              </dd>
            </div>
          )}
          <div>
            <dt className="text-sm text-muted">{t("dashboard.weight")}</dt>
            <dd>
              {currentPet.weight !== null ? formatWeight(currentPet.weight, unitSystem) : t("dashboard.notSet")}
              {weightChange !== null && (
                <span className="ml-2 text-sm text-muted">
                  {weightChange > 0 ? "↑" : "↓"} {formatWeight(Math.abs(weightChange), unitSystem)}
                </span>
              )}
            </dd>
          </div>
        </dl>
      </div>

      {/* Left half is what the pet needs from you; right half is what the pet's data looks like. */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="space-y-6">
          {(currentPet.dietary_restrictions.length > 0 || currentPet.disabilities.length > 0) && (
            <section className="bg-surface border border-border rounded-xl p-6 shadow-soft">
              {currentPet.dietary_restrictions.length > 0 && (
                <div>
                  <h2 className="text-sm text-muted mb-2">{t("petForm.dietary")}</h2>
                  <ul className="flex flex-wrap gap-2">
                    {currentPet.dietary_restrictions.map((item) => (
                      <li key={item} className="rounded-full bg-ink border border-border px-3 py-1 text-sm">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {currentPet.disabilities.length > 0 && (
                <div className={currentPet.dietary_restrictions.length > 0 ? "mt-4" : ""}>
                  <h2 className="text-sm text-muted mb-2">{t("petForm.disabilities")}</h2>
                  <ul className="flex flex-wrap gap-2">
                    {currentPet.disabilities.map((item) => (
                      <li key={item} className="rounded-full bg-ink border border-border px-3 py-1 text-sm">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}
          <section className="bg-surface border border-border rounded-xl p-6 shadow-soft">
            <h2 className="text-lg font-semibold mb-3">{t("dashboard.due")}</h2>
            {due.length === 0 ? (
              <p className="text-muted">{t("dashboard.nothingDue")}</p>
            ) : (
              due.map(e => <EventRow key={e.id} event={e} todayStr={todayStr} onDone={handleDone} />)
            )}
          </section>
          <section className="bg-surface border border-border rounded-xl p-6 shadow-soft">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="text-lg font-semibold">{t("dashboard.scheduled")}</h2>
              <Button variant="secondary" onClick={() => setScheduleOpen(true)} className="inline-flex items-center gap-2">
                <CalendarPlus size={16} />
                {t("dashboard.schedule")}
              </Button>
            </div>
            {scheduled.length === 0 ? (
              <p className="text-muted">{t("dashboard.nothingScheduled")}</p>
            ) : (
              scheduled.map(e => <EventRow key={e.id} event={e} todayStr={todayStr} onDone={handleDone} />)
            )}
          </section>
        </div>

        <div className="space-y-6">
          {summary && <SpendPanel summary={summary} />}
          <WeightPanel records={records} unitSystem={unitSystem} />
          {walksOn && <ExercisePanel walks={walks} unitSystem={unitSystem} />}
          <PhotoPanel petId={currentPet.id} />
        </div>
      </div>

      <Modal open={showForm === "edit"} title={t("dashboard.editPet", { name: currentPet.name })} onClose={() => setShowForm(null)}>
        <PetForm key={currentPet.id} pet={currentPet} onDone={() => setShowForm(null)} />
      </Modal>
      <Modal open={addPetOpen} title={t("dashboard.addPetTitle")} onClose={() => setAddPetOpen(false)}>
        <PetForm key="add" onDone={() => setAddPetOpen(false)} />
      </Modal>
      <Modal open={editingRecord !== null} title={t("dashboard.completeRecord")} onClose={closeRecordForm}>
        {editingRecord && (
          <RecordForm key={editingRecord.id} petId={currentPet.id} record={editingRecord} onDone={closeRecordForm} />
        )}
      </Modal>
      <Modal open={scheduleOpen} title={t("dashboard.scheduleSomething")} onClose={() => setScheduleOpen(false)}>
        <EventForm petId={currentPet.id} onDone={(saved) => { setScheduleOpen(false); if (saved) loadEvents(); }} />
      </Modal>
      <ConfirmDialog
        open={confirmingDelete}
        title={t("dashboard.deleteTitle", { name: currentPet.name })}
        message={t("dashboard.deleteBody")}
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  );
}