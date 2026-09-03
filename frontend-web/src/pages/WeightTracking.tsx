import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { usePets } from "../context/PetContext";
import { useAuth } from "../auth/AuthContext";
import { listRecords, createRecord } from "../api/records";
import { formatWeight, weightUnit, toKg } from "../units";
import { formatDate } from "../dates";
import { errorMessage } from "../errors";
import type { HealthRecord } from "../types";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";

const FIELD = "w-full rounded-lg bg-ink border border-border px-3 py-2 text-sm text-fg focus:border-primary focus:outline-none";

export default function TrackingWeight() {
  const { t } = useTranslation();
  const { currentPet, refresh } = usePets();
  const { user } = useAuth();
  const unitSystem = user?.unit_system ?? "metric";
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [date, setDate] = useState("");
  const [weight, setWeight] = useState("");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!currentPet) return;
    setLoading(true);
    try {
      const all = await listRecords(currentPet.id);
      setRecords(
        all
          .filter((r) => r.record_type === "Weight" && r.weight_kg !== null)
          .sort((a, b) => b.date.localeCompare(a.date)),
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentPet]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setDate(new Date().toLocaleDateString("en-CA"));
    setWeight("");
    setError(null);
    setFormOpen(true);
  }

  // A weigh-in is an ordinary health record of type Weight, so it flows through the same endpoint
  // and the server's sync_pet_weight keeps the pet's current weight and its check-in in step. The
  // title is filled in rather than asked for — there is nothing else a weigh-in could be called.
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPet) return;
    try {
      await createRecord(currentPet.id, {
        record_type: "Weight",
        title: t("tracking.weight"),
        description: null,
        date,
        next_due_date: null,
        weight_kg: toKg(Number(weight), unitSystem),
      });
      setFormOpen(false);
      await refresh();
      load();
    } catch (err) {
      setError(errorMessage(err));
    }
  }

  if (!currentPet) return <p className="p-8 text-muted">{t("common.noPet")}</p>;

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface px-5 py-4">
        <h1 className="text-2xl font-bold text-fg">{t("tracking.weight")}</h1>
        <Button onClick={openCreate} className="flex items-center gap-2 whitespace-nowrap">
          <Plus size={20} strokeWidth={2.5} />
          {t("weightTracking.add")}
        </Button>
      </div>

      {loading && <p className="text-muted">{t("common.loading")}</p>}

      {!loading && records.length === 0 ? (
        <p className="text-muted">{t("weightTracking.empty")}</p>
      ) : (
        records.map((record, index) => {
          // Calculate the change in weight compared to the previous record.
          const previous = records[index + 1];
          const change =
            previous && previous.weight_kg !== null && record.weight_kg !== null
              ? record.weight_kg - previous.weight_kg
              : null;
          return (
            <div
              key={record.id}
              className="mb-3 flex items-center justify-between rounded-xl border border-border bg-surface p-4"
            >
              <div>
                <p className="font-semibold text-fg">{formatWeight(record.weight_kg!, unitSystem)}</p>
                <p className="text-sm text-muted">{formatDate(record.date)}</p>
              </div>
              {change !== null && change !== 0 && (
                <p className="text-sm text-muted">
                  {change > 0 ? "↑" : "↓"} {formatWeight(Math.abs(change), unitSystem)}
                </p>
              )}
            </div>
          );
        })
      )}

      <Modal open={formOpen} title={t("weightTracking.add")} onClose={() => setFormOpen(false)}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="text-sm text-muted">
            {t("common.date")}
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={`mt-1 ${FIELD}`} />
          </label>
          <label className="text-sm text-muted">
            {t("common.weight", { unit: weightUnit(unitSystem) })}
            <input
              type="number"
              required
              min={0.01}
              step="0.01"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className={`mt-1 ${FIELD}`}
            />
          </label>
          {error && <p className="text-sm text-danger">{error}</p>}
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