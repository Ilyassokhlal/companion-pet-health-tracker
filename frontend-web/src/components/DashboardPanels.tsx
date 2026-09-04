import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { listPetPhotos } from "../api/records";
import type { ExpenseSummary, GalleryPhoto, HealthRecord, Walk } from "../types";
import { formatMoney, formatWeight, formatDistance, formatDuration } from "../units";

// The four right-hand dashboard panels. Each is a link into the page that owns its data, so the
// dashboard summarises and the section pages do the work.

const CARD = "block rounded-xl border border-border bg-surface p-5 shadow-soft transition hover:border-primary";

// Same status-to-colour mapping the budget page uses. The server decides the status.
const BAR: Record<string, string> = {
  none: "bg-primary",
  ok: "bg-primary",
  warning: "bg-warning",
  over: "bg-danger",
};

export function SpendPanel({ summary }: { summary: ExpenseSummary }) {
  const { t } = useTranslation();
  return (
    <Link to="/tracking/budget" className={CARD}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-muted">{t("dashboard.spentThisMonth")}</p>
        <p className={`text-sm ${summary.status === "over" ? "font-semibold text-danger" : "text-muted"}`}>
          {summary.limit === null
            ? t("budget.noLimit")
            : summary.status === "over"
              ? t("budget.exceeded")
              : t("budget.of", { limit: formatMoney(summary.limit, summary.currency) })}
        </p>
      </div>
      <p className="mt-1 text-2xl font-bold text-fg">{formatMoney(summary.total, summary.currency)}</p>
      {summary.limit !== null && (
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-ink">
          <div
            className={`h-full transition-all ${BAR[summary.status]}`}
            style={{ width: `${Math.min(summary.percent ?? 0, 100)}%` }}
          />
        </div>
      )}
    </Link>
  );
}

// Inline SVG for the weight trend chart: one polyline for the line and one filled polygon for the area under the line.
const W = 300;
const H = 120;
const PAD = 12;

export function WeightPanel({ records, unitSystem }: { records: HealthRecord[]; unitSystem: string }) {
  const { t } = useTranslation();

  // Oldest first, and only the last dozen — beyond that the line says nothing at this size.
  const series = records
    .filter((r) => r.record_type === "Weight" && r.weight_kg != null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-12);

  const values = series.map((r) => r.weight_kg!);
  const min = Math.min(...values);
  const max = Math.max(...values);

  const points = values.map((value, i) => {
    const x = values.length === 1 ? W / 2 : PAD + (i / (values.length - 1)) * (W - PAD * 2);
    // A flat line has no range to scale against, so it sits in the middle rather than dividing by zero.
    const y = max === min ? H / 2 : H - PAD - ((value - min) / (max - min)) * (H - PAD * 2);
    return { x, y };
  });
  const path = points.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <Link to="/tracking/weight" className={CARD}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-muted">{t("dashboard.weightTrend")}</p>
        {values.length > 0 && (
          <p className="text-sm font-semibold text-fg">{formatWeight(values[values.length - 1], unitSystem)}</p>
        )}
      </div>

      {values.length < 2 ? (
        <p className="mt-3 text-sm text-muted">{t("dashboard.needTwoWeights")}</p>
      ) : (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} className="mt-3 h-32 w-full text-primary" preserveAspectRatio="none">
            <polygon
              points={`${points[0].x},${H} ${path} ${points[points.length - 1].x},${H}`}
              fill="currentColor"
              opacity={0.12}
            />
            <polyline
              points={path}
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          <div className="mt-1 flex justify-between text-xs text-muted">
            <span>{formatWeight(min, unitSystem)}</span>
            <span>{formatWeight(max, unitSystem)}</span>
          </div>
        </>
      )}
    </Link>
  );
}

export function ExercisePanel({ walks, unitSystem }: { walks: Walk[]; unitSystem: string }) {
  const { t } = useTranslation();

  // The last seven days, oldest first, so today is the rightmost bar.
  const days: { key: string; minutes: number }[] = [];
  for (let back = 6; back >= 0; back--) {
    const day = new Date();
    day.setDate(day.getDate() - back);
    const key = day.toLocaleDateString("en-CA");
    const minutes = walks
      .filter((w) => w.date === key)
      .reduce((sum, w) => sum + w.duration_minutes, 0);
    days.push({ key, minutes });
  }

  const totalMinutes = days.reduce((sum, d) => sum + d.minutes, 0);
  const totalKm = walks
    .filter((w) => days.some((d) => d.key === w.date))
    .reduce((sum, w) => sum + (w.distance_km ?? 0), 0);
  const peak = Math.max(...days.map((d) => d.minutes), 1);

  return (
    <Link to="/tracking/walks" className={CARD}>
      <p className="text-sm text-muted">{t("dashboard.exercise")}</p>

      {totalMinutes === 0 ? (
        <p className="mt-3 text-sm text-muted">{t("dashboard.noWalksWeek")}</p>
      ) : (
        <>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3">
            <p className="text-2xl font-bold text-fg">{formatDuration(totalMinutes)}</p>
            {totalKm > 0 && <p className="text-sm text-muted">{formatDistance(totalKm, unitSystem)}</p>}
          </div>
          <div className="mt-3 flex h-16 items-end gap-1.5">
            {days.map((day) => (
              <div key={day.key} className="flex-1">
                <div
                  className={`w-full rounded-t ${day.minutes > 0 ? "bg-primary" : "bg-ink"}`}
                  // A logged day never renders as a hairline, so "some" is always visibly more than "none".
                  style={{ height: `${day.minutes > 0 ? Math.max((day.minutes / peak) * 64, 6) : 3}px` }}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </Link>
  );
}

export function PhotoPanel({ petId }: { petId: number }) {
  const { t } = useTranslation();
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
    listPetPhotos(petId).then(setPhotos).catch(() => setPhotos([]));
  }, [petId]);

  useEffect(() => {
    if (photos.length < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % photos.length), 4000);
    return () => clearInterval(timer);
  }, [photos.length]);

  return (
    <Link to="/photos" className={CARD}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm text-muted">{t("nav.photos")}</p>
        {photos.length > 0 && <p className="text-sm text-muted">{photos.length}</p>}
      </div>

      {photos.length === 0 ? (
        <p className="mt-3 text-sm text-muted">{t("dashboard.noPhotos")}</p>
      ) : (
        <div className="relative mt-3 aspect-square overflow-hidden rounded-lg bg-ink">
          {photos.map((photo, i) => (
            <img
              key={photo.id}
              src={`${import.meta.env.VITE_API_URL}/photos/${photo.filename}`}
              alt={photo.record_title}
              // All frames stay mounted and cross-fade, so the panel never flashes empty between them.
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                i === index ? "opacity-100" : "opacity-0"
              }`}
            />
          ))}
        </div>
      )}
    </Link>
  );
}