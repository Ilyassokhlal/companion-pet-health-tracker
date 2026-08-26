import { usePets } from "../context/PetContext";
import { useState, useEffect, useCallback } from "react";
import { listEvents, completeEvent } from "../api/events";
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

// Formats a pet's age: returns "Unknown" if birth date is not provided, days if under one month, months if under one year, and years otherwise.
function formatAge(birthDate: string | null): string {
    if (!birthDate) {
        return "Unknown";
    }
    const birth = new Date(`${birthDate}T00:00:00`);
    const now = new Date();
    let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    if (now.getDate() < birth.getDate()) {
        months--;
    }
    if (months < 1) {
        const days = Math.floor((now.getTime() - birth.getTime()) / 86400000);
        return days === 1 ? "1 day" : `${days} days`;
    }
    if (months < 12) {
        return months === 1 ? "1 month" : `${months} months`;
    }
    const years = Math.floor(months / 12);
    return years === 1 ? "1 year" : `${years} years`;
}

// Returns a CSS class for a due date: red if overdue, yellow if due today, default otherwise.
function dueClass(dueDate: string, todayStr: string): string {
  if (dueDate < todayStr) return "text-danger";
  if (dueDate === todayStr) return "text-warning";
  return "";
}

// Renders a single scheduled event row with its title, due date, and a Done button. Highlights overdue and due-today events. Calls onDone when the event is marked as done.
function EventRow({ event, todayStr, onDone }: { event: ScheduledEvent; todayStr: string; onDone: (event: ScheduledEvent) => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 py-1.5">
      <p className={dueClass(event.due_date, todayStr)}>
        {event.due_date < todayStr && "Overdue: "}
        {event.title}
        {event.record_type && <span className="text-muted"> · {event.record_type}</span>}
        {" — "}
        {new Date(`${event.due_date}T00:00:00`).toLocaleDateString()}
      </p>
      <Button variant="secondary" onClick={() => onDone(event)} className="inline-flex items-center gap-2">
        <Check size={16} />
        Done
      </Button>
    </div>
  );
}

// The Dashboard component manages the display and interaction with the current pet's information, scheduled events, and health records. It handles loading state, adding a new pet, completing events, and deleting the current pet.
export default function Dashboard() {
  const { currentPet, loading, refresh, addPetOpen, setAddPetOpen } = usePets();
  const [showForm, setShowForm] = useState<"edit" | null>(null);
  const [events, setEvents] = useState<ScheduledEvent[]>([]);
  const [editingRecord, setEditingRecord] = useState<HealthRecord | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Loads the current pet's upcoming scheduled events. Kept as a callback so it can be re-run after an event is completed or a new one is scheduled.
  const loadEvents = useCallback(() => {
    if (!currentPet) {
      setEvents([]);
      return;
    }
    listEvents(currentPet.id).then(setEvents).catch(console.error);
  }, [currentPet]);

  useEffect(loadEvents, [loadEvents]);

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
    return <div className="p-8">Loading…</div>;
  }
  if (!currentPet) {
    return (
    <div className="p-4 sm:p-8">
        <p className="text-muted">You haven't added a pet yet.</p>
        <Button onClick={() => setAddPetOpen(true)} className="mt-4">
          Add Pet
        </Button>
        <Modal open={addPetOpen} title="Add pet" onClose={() => setAddPetOpen(false)}>
          <PetForm onDone={() => setAddPetOpen(false)} />
        </Modal>
      </div>
    );
  }

// Splits the pet's events by type: due events (follow-ups and weight check-ins) and scheduled appointments.
  const todayStr = new Date().toLocaleDateString("en-CA");
  const due = events.filter(e => e.kind !== "Appointment");
  const scheduled = events.filter(e => e.kind === "Appointment");

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-wrap items-center gap-4">
        <PetPhoto pet={currentPet} />
        <h1 className="text-2xl font-bold">{currentPet.name}</h1>
        <div className="flex gap-2">
          <Button onClick={() => setShowForm("edit")} className="inline-flex items-center gap-2">
            <Pencil size={16} />
            Edit
          </Button>
          <Button variant="danger" onClick={() => setConfirmingDelete(true)} className="inline-flex items-center gap-2">
            <Trash2 size={16} />
            Delete
          </Button>
        </div>
      </div>
      <dl className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div><dt className="text-sm text-muted">Species</dt><dd>{currentPet.species}</dd></div>
        <div><dt className="text-sm text-muted">Breed</dt><dd>{currentPet.breed ?? "Not set"}</dd></div>
        <div><dt className="text-sm text-muted">Age</dt><dd>{formatAge(currentPet.birth_date)}</dd></div>
        <div><dt className="text-sm text-muted">Weight</dt><dd>{currentPet.weight !== null ? `${currentPet.weight} kg` : "Not set"}</dd></div>
      </dl>
      <section className="mt-8 bg-surface border border-border rounded-xl p-6 shadow-soft">
        <h2 className="text-lg font-semibold mb-3">Due</h2>
        {due.length === 0 ? (
          <p className="text-muted">Nothing due.</p>
        ) : (
          due.map(e => <EventRow key={e.id} event={e} todayStr={todayStr} onDone={handleDone} />)
        )}
      </section>
      <section className="mt-6 bg-surface border border-border rounded-xl p-6 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <h2 className="text-lg font-semibold">Scheduled</h2>
          <Button variant="secondary" onClick={() => setScheduleOpen(true)} className="inline-flex items-center gap-2">
            <CalendarPlus size={16} />
            Schedule
          </Button>
        </div>
        {scheduled.length === 0 ? (
          <p className="text-muted">Nothing scheduled.</p>
        ) : (
          scheduled.map(e => <EventRow key={e.id} event={e} todayStr={todayStr} onDone={handleDone} />)
        )}
      </section>
      <Modal open={showForm === "edit"} title={`Edit ${currentPet.name}`} onClose={() => setShowForm(null)}>
        <PetForm key={currentPet.id} pet={currentPet} onDone={() => setShowForm(null)} />
      </Modal>
      <Modal open={addPetOpen} title="Add pet" onClose={() => setAddPetOpen(false)}>
        <PetForm key="add" onDone={() => setAddPetOpen(false)} />
      </Modal>
      <Modal open={editingRecord !== null} title="Complete record" onClose={closeRecordForm}>
        {editingRecord && (
          <RecordForm key={editingRecord.id} petId={currentPet.id} record={editingRecord} onDone={closeRecordForm} />
        )}
      </Modal>
      <Modal open={scheduleOpen} title="Schedule something" onClose={() => setScheduleOpen(false)}>
        <EventForm petId={currentPet.id} onDone={(saved) => { setScheduleOpen(false); if (saved) loadEvents(); }} />
      </Modal>
      <ConfirmDialog
        open={confirmingDelete}
        title={`Delete ${currentPet.name}?`}
        message="Their health records, photos and chat history are deleted too. This cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  );
}