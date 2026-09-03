import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Scale, Footprints, Utensils, Wallet } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { usePets } from "../context/PetContext";
import { listRecords } from "../api/records";
import { listWalks } from "../api/walks";
import { feedingStatus } from "../api/feeding";
import { getExpenseSummary } from "../api/expenses";
import { formatWeight, formatMoney } from "../units";
import { formatDate } from "../dates";

// Tracking page for the current pet, displaying weight, walks, feeding, and budget information. The page shows the most recent data for each category and links to detailed views.
export default function Tracking() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentPet } = usePets();
  const unitSystem = user?.unit_system ?? "metric";
  const walksOn = user?.walk_tracking_enabled ?? false;

  const [weight, setWeight] = useState<string | null>(null);
  const [walk, setWalk] = useState<string | null>(null);
  const [feeding, setFeeding] = useState<string | null>(null);
  const [spend, setSpend] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!currentPet) return;
    const today = new Date().toLocaleDateString("en-CA");

    // Four independent fetches rather than a Promise.all: one tracker failing must not blank the other three cards.
    listRecords(currentPet.id)
      .then((all) => {
        const weighed = all
          .filter((r) => r.record_type === "Weight" && r.weight_kg !== null)
          .sort((a, b) => b.date.localeCompare(a.date));
        setWeight(weighed.length === 0 ? null : formatWeight(weighed[0].weight_kg!, unitSystem));
      })
      .catch(() => setWeight(null));

    if (walksOn) {
      listWalks(currentPet.id)
        .then((rows) => {
          // The API returns newest first, so rows[0] is the most recent walk.
          if (rows.length === 0) {
            setWalk(null);
            return;
          }
          setWalk(
            rows[0].date === today
              ? t("tracking.walkedToday")
              : t("tracking.lastWalk", { date: formatDate(rows[0].date) }),
          );
        })
        .catch(() => setWalk(null));
    }

    feedingStatus(currentPet.id)
      .then((slots) => {
        // Slots come back in time order. What is due now beats what is merely upcoming.
        const next = slots.find((s) => s.status === "due") ?? slots.find((s) => s.status === "upcoming");
        setFeeding(next ? t("tracking.nextFeeding", { time: next.time.slice(0, 5) }) : null);
      })
      .catch(() => setFeeding(null));

    getExpenseSummary(currentPet.id, today.slice(0, 7))
      .then((s) => setSpend(t("tracking.spentThisMonth", { amount: formatMoney(s.total, s.currency) })))
      .catch(() => setSpend(null));
  }, [currentPet, unitSystem, walksOn, t]);

  useEffect(() => {
    load();
  }, [load]);

  // Early return if no current pet is selected. This ensures that the rest of the component only renders when a pet is available.
  if (!currentPet) return <p className="p-4 sm:p-8 text-muted">{t("common.noPet")}</p>;

  const rows = [
    { to: "/tracking/weight", key: "weight", Icon: Scale, value: weight, shown: true },
    { to: "/tracking/walks", key: "walks", Icon: Footprints, value: walk, shown: walksOn },
    { to: "/tracking/feeding", key: "feeding", Icon: Utensils, value: feeding, shown: true },
    { to: "/tracking/budget", key: "budget", Icon: Wallet, value: spend, shown: true },
  ].filter((row) => row.shown);

  return (
    <div className="p-4 sm:p-8">
      {/* The title gets its own card so it is not reading straight off the background pattern. */}
      <div className="mb-6 rounded-xl border border-border bg-surface px-5 py-4">
        <h1 className="text-2xl font-bold text-fg">{t("tracking.title")}</h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => (
          <Link
            key={row.to}
            to={row.to}
            className="group flex items-start gap-4 rounded-xl border border-border bg-surface p-5 transition hover:border-primary"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition group-hover:bg-primary/20">
              <row.Icon size={22} />
            </span>
            <div className="min-w-0">
              <p className="text-lg font-semibold text-fg">{t(`tracking.${row.key}`)}</p>
              <p className="mt-0.5 text-sm text-muted">{t(`tracking.${row.key}Hint`)}</p>
              <p className="mt-2 text-base font-semibold text-primary">
                {row.value ?? t("tracking.noData")}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}