import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

// Tracking page that displays links to different tracking sections (weight, walks, feeding) based on user settings.
export default function Tracking() {
  const { user } = useAuth();

  const rows = [
    {
      to: "/tracking/weight",
      label: "Weight",
      hint: "Weigh-ins and how they have changed",
      shown: user?.weight_tracking_enabled ?? false,
    },
    {
      to: "/tracking/walks",
      label: "Walks",
      hint: "Logged walks, newest first",
      shown: user?.walk_tracking_enabled ?? false,
    },
    {
      to: "/tracking/feeding",
      label: "Feeding",
      hint: "Feeding times and today's log",
      shown: true,
    },
  ].filter((row) => row.shown);

  return (
    <div className="p-4 sm:p-8">
      <h1 className="mb-6 text-2xl font-bold">Tracking</h1>

      {rows.length === 0 ? (
        <p className="text-muted">Turn on weight or walk tracking in Settings to see them here.</p>
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