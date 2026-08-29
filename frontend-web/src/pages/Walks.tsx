import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { usePets } from "../context/PetContext";
import { useAuth } from "../auth/AuthContext";
import { listWalks, createWalk, updateWalk, deleteWalk } from "../api/walks";
import type { WalkCreate } from "../api/walks";
import type { Walk } from "../types";
import { formatDistance, formatDuration, fromKm, toKm, distanceUnit } from "../units";
import { formatDate } from "../dates";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";

const FIELD = "w-full rounded-lg bg-ink border border-border px-3 py-2 text-sm text-fg focus:border-primary focus:outline-none";

// Logged walks are displayed in a list and can be created, edited, or deleted.
export default function Walks() {
  const { t } = useTranslation();
  const { currentPet } = usePets();
  const { user } = useAuth();
  const unitSystem = user?.unit_system ?? "metric";

  const [walks, setWalks] = useState<Walk[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Walk | null>(null);
  const [confirming, setConfirming] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState("");
  const [duration, setDuration] = useState("");
  const [distance, setDistance] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    if (!currentPet) return;
    setLoading(true);
    try {
      setWalks(await listWalks(currentPet.id));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [currentPet]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setDate(new Date().toLocaleDateString("en-CA"));
    setDuration("");
    setDistance("");
    setNotes("");
    setError(null);
    setFormOpen(true);
  }

  function openEdit(walk: Walk) {
    setEditing(walk);
    setDate(walk.date);
    setDuration(String(walk.duration_minutes));
    setDistance(walk.distance_km === null ? "" : String(fromKm(walk.distance_km, unitSystem)));
    setNotes(walk.notes ?? "");
    setError(null);
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPet) return;
    // Distance is optional, so an empty box means null rather than zero.
    const payload: WalkCreate = {
      date,
      duration_minutes: Number(duration),
      distance_km: distance === "" ? null : toKm(Number(distance), unitSystem),
      notes: notes.trim() === "" ? null : notes.trim(),
    };
    try {
      if (editing) await updateWalk(editing.id, payload);
      else await createWalk(currentPet.id, payload);
      setFormOpen(false);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteWalk(id);
      setConfirming(null);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (!currentPet) return <p className="text-muted p-4 sm:p-8">{t("walks.noPet")}</p>;
  if (!user?.walk_tracking_enabled) return <p className="text-muted p-4 sm:p-8">{t("walks.trackingOff")}</p>;

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-fg">{t("walks.title")}</h1>
        <Button onClick={openCreate} className="flex items-center gap-1.5">
          <Plus size={16} />
          {t("walks.log")}
        </Button>
      </div>

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}
      {loading && <p className="text-muted">{t("common.loading")}</p>}
      {!loading && walks.length === 0 && <p className="text-muted">{t("walks.empty")}</p>}

      <div className="flex flex-col gap-3">
        {walks.map((walk) => (
          <div key={walk.id} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-fg">{formatDate(walk.date)}</p>
                <p className="text-sm text-muted">
                  {formatDuration(walk.duration_minutes)}
                  {walk.distance_km !== null && ` · ${formatDistance(walk.distance_km, unitSystem)}`}
                </p>
              </div>
              {confirming === walk.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-fg">{t("walks.confirmDelete")}</span>
                  <button
                    onClick={() => handleDelete(walk.id)}
                    className="rounded-lg bg-danger px-3 py-1.5 text-sm font-medium text-white transition hover:brightness-110"
                  >
                    {t("common.delete")}
                  </button>
                  <button
                    onClick={() => setConfirming(null)}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition hover:text-fg"
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(walk)}
                    aria-label={t("walks.edit")}
                    className="rounded-lg p-2 text-muted transition hover:bg-hover hover:text-fg"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setConfirming(walk.id)}
                    aria-label={t("common.delete")}
                    className="rounded-lg p-2 text-danger transition hover:bg-danger/10"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
            {walk.notes && <p className="mt-2 text-sm text-muted">{walk.notes}</p>}
          </div>
        ))}
      </div>

      <Modal open={formOpen} title={editing ? t("walks.edit") : t("walks.log")} onClose={() => setFormOpen(false)}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="text-sm text-muted">
            {t("walks.date")}
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={`mt-1 ${FIELD}`} />
          </label>
          <label className="text-sm text-muted">
            {t("walks.duration")}
            <input
              type="number"
              required
              min={1}
              max={1440}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className={`mt-1 ${FIELD}`}
            />
          </label>
          <label className="text-sm text-muted">
            {t("walks.distance", { unit: distanceUnit(unitSystem) })}
            <input
              type="number"
              min={0}
              step="0.1"
              value={distance}
              onChange={(e) => setDistance(e.target.value)}
              className={`mt-1 ${FIELD}`}
            />
          </label>
          <label className="text-sm text-muted">
            {t("walks.notes")}
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={`mt-1 ${FIELD}`} />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit">{t("common.save")}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}