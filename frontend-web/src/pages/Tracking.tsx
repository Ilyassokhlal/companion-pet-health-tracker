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

// Tracking hub. Each card links to its section and carries that section's current figure, so the
// page says something about the pet rather than being four empty links. No page title: Records and
// Photos do not carry one either, and the nav already says where you are.
export default function Tracking() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentPet } = usePets();
  const unitSystem = user?.unit_system ?? "metric";

  const [weight, setWeight] = useState<string | null>(null);
  const [walk, setWalk] = useState<string | null>(null);
  const [feeding, setFeeding] = useState<string | null>(null);
  const [spend, setSpend] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!currentPet) return;
    const today = new Date().toLocaleDateString("en-CA");

    // Four independent fetches rather than a Promise.all: one tracker failing must not blank the
    // other three cards.
    listRecords(currentPet.id)
      .then((all) => {
        const weighed = all
          .filter((r) => r.record_type === "Weight" && r.weight_kg !== null)
          .sort((a, b) => b.date.localeCompare(a.date));
        setWeight(weighed.length === 0 ? null : formatWeight(weighed[0].weight_kg!, unitSystem));
      })
      .catch(() => setWeight(null));

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
  }, [currentPet, unitSystem, t]);

  useEffect(() => {
    load();
  }, [load]);

  // Every early return sits below the hooks: an early return between them is invisible until a hook
  // is added above it, which is how Modal.tsx blanked every dialog for two versions.
  if (!currentPet) return <p className="p-4 sm:p-8 text-muted">{t("common.noPet")}</p>;

  // All four rows are unconditional. The account switches govern check-ins and reminders, not
  // whether the history can be read, and each page explains its own switch when it is off.
  const rows = [
    { to: "/tracking/weight", key: "weight", Icon: Scale, value: weight },
    { to: "/tracking/walks", key: "walks", Icon: Footprints, value: walk },
    { to: "/tracking/feeding", key: "feeding", Icon: Utensils, value: feeding },
    { to: "/tracking/budget", key: "budget", Icon: Wallet, value: spend },
  ];

  return (
    <div className="p-4 sm:p-8">
      {/* Two columns, so the four cards sit as a 2x2 and every card is the same size. */}
      <div className="grid gap-5 sm:grid-cols-2">
        {rows.map((row) => (
          <Link
            key={row.to}
            to={row.to}
            className="group flex min-h-40 items-start gap-5 rounded-xl border border-border bg-surface p-7 transition hover:border-primary"
          >
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary/20">
              <row.Icon size={28} />
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