import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { usePets } from "../context/PetContext";
import { useAuth } from "../auth/AuthContext";
import { listRecords } from "../api/records";
import { formatWeight } from "../units";
import { formatDate } from "../dates";
import type { HealthRecord } from "../types";

export default function TrackingWeight() {
  const { t } = useTranslation();
  const { currentPet } = usePets();
  const { user } = useAuth();
  const unitSystem = user?.unit_system ?? "metric";
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!currentPet) return;
    setLoading(true);
    try {
      const all = await listRecords(currentPet.id);
      setRecords(all.filter((r) => r.record_type === "Weight" && r.weight_kg !== null));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentPet]);

  useEffect(() => {
    load();
  }, [load]);

  if (!currentPet) return <p className="p-8 text-muted">{t("common.noPet")}</p>;
  if (loading) return <p className="p-8 text-muted">{t("common.loading")}</p>;

  return (
    <div className="p-4 sm:p-8">
      <h1 className="mb-1 text-2xl font-bold">{t("tracking.weight")}</h1>
      <p className="mb-6 text-sm text-muted">{currentPet.name}</p>

      {records.length === 0 ? (
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
    </div>
  );
}