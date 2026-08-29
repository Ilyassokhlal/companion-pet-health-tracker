import { useState, useEffect, useCallback } from "react";
import { usePets } from "../context/PetContext";
import {
  listFeedingTimes, createFeedingTime, deleteFeedingTime,
  listFeedings, createFeeding, deleteFeeding, feedingStatus,
} from "../api/feeding";
import { AMOUNT_UNITS } from "../types";
import type { Feeding as FeedingLog, FeedingTime, SlotStatus } from "../types";
import { formatDate } from "../dates";
import { Trash2 } from "lucide-react";

const STATUS_STYLE: Record<SlotStatus["status"], string> = {
  met: "text-muted",
  due: "text-warning",
  missed: "text-danger",
  upcoming: "text-muted",
};

const STATUS_LABEL: Record<SlotStatus["status"], string> = {
  met: "Fed",
  due: "Due now",
  missed: "Missed",
  upcoming: "Later today",
};

// Component for managing feeding times and feeding logs for the current pet.
// Allows adding, deleting, and viewing feeding times and logs, and shows the status of each feeding slot.
export default function Feeding() {
  const { currentPet } = usePets();
  const [times, setTimes] = useState<FeedingTime[]>([]);
  const [statuses, setStatuses] = useState<SlotStatus[]>([]);
  const [log, setLog] = useState<FeedingLog[]>([]);
  const [newTime, setNewTime] = useState("");
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toLocaleDateString("en-CA");
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("");
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

  useEffect(() => {
    load();
  }, [load]);

  async function addTime() {
    if (!currentPet || !newTime) return;
    setError(null);
    try {
      await createFeedingTime(currentPet.id, `${newTime}:00`);
      setNewTime("");
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function addFeeding() {
    if (!currentPet || !time) {
      setError("A feeding needs a time.");
      return;
    }
    setError(null);
    try {
      const typed = amount.trim() === "" ? null : Number(amount);
      await createFeeding(currentPet.id, {
        date,
        time: `${time}:00`,
        food: food.trim() || null,
        amount: typed,
        amount_unit: typed === null ? null : unit,
        notes: notes.trim() || null,
      });
      setTime("");
      setFood("");
      setAmount("");
      setNotes("");
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (!currentPet) return <p className="p-8 text-muted">Add a pet first.</p>;

  const field = "rounded-lg bg-ink border border-border px-3 py-1.5 text-sm text-fg focus:border-primary focus:outline-none";

  return (
    <div className="p-4 sm:p-8">
      <h1 className="mb-1 text-2xl font-bold">Feeding</h1>
      <p className="mb-6 text-sm text-muted">{currentPet.name}</p>
      {error && <p className="mb-4 text-sm text-danger">{error}</p>}

      <section className="mb-6 rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-3 text-lg font-semibold">Schedule</h2>
        {times.length === 0 && (
          <p className="mb-3 text-sm text-muted">
            No feeding times set. Adding one turns on the dashboard indicator and lets reminders fire.
          </p>
        )}
        {times.map((entry) => {
          const status = statuses.find((s) => s.time === entry.time);
          return (
            <div key={entry.id} className="flex items-center justify-between border-t border-border py-2">
              <span className="text-fg">{entry.time.slice(0, 5)}</span>
              <div className="flex items-center gap-4">
                {status && (
                  <span className={`text-sm ${STATUS_STYLE[status.status]}`}>
                    {STATUS_LABEL[status.status]}
                  </span>
                )}
                <button
                  onClick={() => deleteFeedingTime(entry.id).then(load)}
                  className="text-danger hover:brightness-125"
                  aria-label="Remove feeding time"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
        <div className="mt-4 flex items-center gap-3">
          {/* step=900 restricts the picker to 15-minute increments, which the server also enforces. */}
          <input type="time" step="900" value={newTime} onChange={(e) => setNewTime(e.target.value)} className={field} />
          <button onClick={addTime} className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-on-primary">
            Add time
          </button>
        </div>
      </section>

      <section className="mb-6 rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-3 text-lg font-semibold">Log a feeding</h2>
        <div className="flex flex-wrap items-center gap-3">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={field} />
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={field} />
          <input placeholder="Food" value={food} onChange={(e) => setFood(e.target.value)} className={field} />
          <input
            type="number"
            min="0"
            step="any"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={`${field} w-28`}
          />
          <select value={unit} onChange={(e) => setUnit(e.target.value)} className={field}>
            {AMOUNT_UNITS.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          <input placeholder="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} className={`${field} grow`} />
          <button onClick={addFeeding} className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-on-primary">
            Log
          </button>
        </div>
      </section>

      <h2 className="mb-3 text-lg font-semibold">History</h2>
      {log.length === 0 ? (
        <p className="text-muted">Nothing logged yet.</p>
      ) : (
        log.map((entry) => (
          <div key={entry.id} className="mb-3 flex items-start justify-between rounded-xl border border-border bg-surface p-4">
            <div>
              <p className="font-semibold text-fg">
                {formatDate(entry.date)} · {entry.time.slice(0, 5)}
              </p>
              <p className="text-sm text-muted">
                {[entry.food, entry.amount !== null ? `${entry.amount} ${entry.amount_unit ?? ""}`.trim() : null]
                  .filter(Boolean)
                  .join(" · ") || "No details"}
              </p>
              {entry.notes && <p className="mt-1 text-sm text-fg">{entry.notes}</p>}
            </div>
            <button
              onClick={() => deleteFeeding(entry.id).then(load)}
              className="text-danger hover:brightness-125"
              aria-label="Delete feeding"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))
      )}
    </div>
  );
}