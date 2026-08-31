import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";

// Tracking page that displays links to different tracking sections (weight, walks, feeding, budget) based on user settings.
export default function Tracking() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const rows = [
    {
      to: "/tracking/weight",
      label: t("tracking.weight"),
      hint: t("tracking.weightHint"),
      shown: user?.weight_tracking_enabled ?? false,
    },
    {
      to: "/tracking/walks",
      label: t("tracking.walks"),
      hint: t("tracking.walksHint"),
      shown: user?.walk_tracking_enabled ?? false,
    },
    {
      to: "/tracking/feeding",
      label: t("tracking.feeding"),
      hint: t("tracking.feedingHint"),
      shown: true,
    },
    {
      to: "/tracking/budget",
      label: t("tracking.budget"),
      hint: t("tracking.budgetHint"),
      shown: true,
    },
  ].filter((row) => row.shown);

  return (
    <div className="p-4 sm:p-8">
      <h1 className="mb-6 text-2xl font-bold">{t("tracking.title")}</h1>

      {rows.length === 0 ? (
        <p className="text-muted">{t("tracking.empty")}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <Link
              key={row.to}
              to={row.to}
              className="rounded-xl border border-border bg-surface p-5 transition hover:border-primary"
            >
              <p className="text-lg font-semibold text-fg">{row.label}</p>
              <p className="mt-1 text-sm text-muted">{row.hint}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}