import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2, Utensils } from "lucide-react";
import EmptyState from "../components/EmptyState";
import { usePets } from "../context/PetContext";
import {
  listFeedingTimes, createFeedingTime, deleteFeedingTime,
  listFeedings, createFeeding, deleteFeeding, feedingStatus,
} from "../api/feeding";
import { AMOUNT_UNITS } from "../types";
import type { Feeding as FeedingLog, FeedingTime, SlotStatus } from "../types";
import { formatDate } from "../dates";
import { errorMessage } from "../errors";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";

const STATUS_STYLE: Record<SlotStatus["status"], string> = {
  met: "text-muted",
  due: "text-warning",
  missed: "text-danger",
  upcoming: "text-muted",
};

const FIELD = "w-full rounded-lg bg-ink border border-border px-3 py-2 text-sm text-fg focus:border-primary focus:outline-none";

// Component for managing feeding times and feeding logs for the current pet.
// Allows adding, deleting, and viewing feeding times and logs, and shows the status of each feeding slot.
// Both actions go through a button that opens a form, matching Budget and Walks — the inline rows of
// bare inputs gave no indication of what they were for.
export default function Feeding() {
  const { t } = useTranslation();
  const { currentPet } = usePets();
  const [times, setTimes] = useState<FeedingTime[]>([]);
  const [statuses, setStatuses] = useState<SlotStatus[]>([]);
  const [log, setLog] = useState<FeedingLog[]>([]);
  const [newTime, setNewTime] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [timeOpen, setTimeOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);

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

  function openTime() {
    setNewTime("");
    setError(null);
    setTimeOpen(true);
  }

  function openLog() {
    setDate(today);
    setTime("");
    setFood("");
    setAmount("");
    setUnit("g");
    setNotes("");
    setError(null);
    setLogOpen(true);
  }

  async function addTime(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPet || !newTime) return;
    setError(null);
    try {
      await createFeedingTime(currentPet.id, `${newTime}:00`);
      setNewTime("");
      setTimeOpen(false);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  async function addFeeding(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPet || !time) {
      setError(t("feeding.timeRequired"));
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
      setLogOpen(false);
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (!currentPet) return <p className="p-8 text-muted">{t("common.noPet")}</p>;

  return (
    <div className="p-4 sm:p-8">
      {/* The title bar gets its own card so it is not reading straight off the background pattern. */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-5 py-4">
        <h1 className="text-2xl font-bold text-fg">{t("tracking.feeding")}</h1>
        <Button onClick={openLog} className="flex items-center gap-2 whitespace-nowrap">
          <Plus size={20} strokeWidth={2.5} />
          {t("feeding.logTitle")}
        </Button>
      </div>

      {error && !timeOpen && !logOpen && <p className="mb-4 text-sm text-danger">{error}</p>}

      <section className="mb-6 rounded-xl border border-border bg-surface p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">{t("feeding.schedule")}</h2>
          <Button variant="secondary" onClick={openTime} className="flex items-center gap-2 whitespace-nowrap px-3 py-1.5 text-sm">
            <Plus size={16} strokeWidth={2.5} />
            {t("feeding.addTime")}
          </Button>
        </div>
        {times.length === 0 && (
          <p className="text-sm text-muted">
            {t("feeding.noTimes")}
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
                    {t(`feeding.status.${status.status}`)}
                  </span>
                )}
                <button
                  onClick={() => deleteFeedingTime(entry.id).then(load)}
                  className="text-danger hover:brightness-125"
                  aria-label={t("feeding.removeTime")}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          );
        })}
      </section>

      <h2 className="mb-3 text-lg font-semibold">{t("feeding.history")}</h2>
      {log.length === 0 ? (
        <EmptyState icon={Utensils} text={t("feeding.empty")} />
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
                  .join(" · ") || t("feeding.noDetails")}
              </p>
              {entry.notes && <p className="mt-1 text-sm text-fg">{entry.notes}</p>}
            </div>
            <button
              onClick={() => deleteFeeding(entry.id).then(load)}
              className="text-danger hover:brightness-125"
              aria-label={t("feeding.deleteEntry")}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))
      )}

      <Modal open={timeOpen} title={t("feeding.addTime")} onClose={() => setTimeOpen(false)}>
        <form onSubmit={addTime} className="flex flex-col gap-4">
          <label className="text-sm text-muted">
            {t("feeding.time")}
            {/* step=900 restricts the picker to 15-minute increments, which the server also enforces. */}
            <input
              type="time"
              step="900"
              required
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className={`mt-1 ${FIELD}`}
            />
          </label>
          <p className="text-sm text-muted">{t("feeding.noTimes")}</p>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setTimeOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit">{t("common.save")}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={logOpen} title={t("feeding.logTitle")} onClose={() => setLogOpen(false)}>
        <form onSubmit={addFeeding} className="flex flex-col gap-4">
          <label className="text-sm text-muted">
            {t("common.date")}
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={`mt-1 ${FIELD}`} />
          </label>
          <label className="text-sm text-muted">
            {t("feeding.time")}
            <input type="time" required value={time} onChange={(e) => setTime(e.target.value)} className={`mt-1 ${FIELD}`} />
          </label>
          <label className="text-sm text-muted">
            {t("feeding.food")}
            <input value={food} onChange={(e) => setFood(e.target.value)} className={`mt-1 ${FIELD}`} />
          </label>
          <div className="flex gap-3">
            <label className="flex-1 text-sm text-muted">
              {t("feeding.amount")}
              <input
                type="number"
                min="0"
                step="any"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`mt-1 ${FIELD}`}
              />
            </label>
            <label className="w-32 text-sm text-muted">
              {t("feeding.unit")}
              <select value={unit} onChange={(e) => setUnit(e.target.value)} className={`mt-1 ${FIELD}`}>
                {AMOUNT_UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="text-sm text-muted">
            {t("feeding.notes")}
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={`mt-1 ${FIELD}`} />
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setLogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit">{t("feeding.logButton")}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}