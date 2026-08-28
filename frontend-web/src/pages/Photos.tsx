import { useState, useEffect, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePets } from "../context/PetContext";
import { listPetPhotos, deleteRecordPhoto } from "../api/records";
import { RECORD_TYPES } from "../types";
import type { GalleryPhoto, RecordType } from "../types";
import { X, Trash2, SlidersHorizontal } from "lucide-react";
import { formatDateLong, dateLocale } from "../dates";

// The Photos component displays a gallery of photos associated with the current pet. It fetches the photos from the API, allows users to view individual photos in a modal, and provides functionality to delete photos. The component handles loading states and displays appropriate messages when there are no pets or no photos available.
export default function Photos() {

  const { t } = useTranslation();
  const { currentPet } = usePets();
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<GalleryPhoto | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [types, setTypes] = useState<RecordType[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const load = useCallback(async () => {
    if (!currentPet) return;
    setLoading(true);
    try {
      const data = await listPetPhotos(currentPet.id);
      setPhotos(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentPet]);

  useEffect(() => {
    load();
  }, [load]);   // above any early return

  // Filtering and grouping derive from the one list already fetched, so no filter change costs a request.
  // Dates compare as ISO strings, and the server orders by record date descending, so the months land in the map already newest-first and never need sorting.
  const months = useMemo(() => {
    const byMonth = new Map<string, GalleryPhoto[]>();
    for (const p of photos) {
      if (types.length > 0 && !types.includes(p.record_type)) continue;
      if (from && p.record_date < from) continue;
      if (to && p.record_date > to) continue;
      const key = p.record_date.slice(0, 7);
      const bucket = byMonth.get(key);
      if (bucket) bucket.push(p);
      else byMonth.set(key, [p]);
    }
    return [...byMonth];
  }, [photos, types, from, to]);

  const activeFilters = types.length + (from ? 1 : 0) + (to ? 1 : 0);

  const toggleType = (type: RecordType) =>
    setTypes((current) =>
      current.includes(type) ? current.filter((x) => x !== type) : [...current, type]
    );

  const clearFilters = () => {
    setTypes([]);
    setFrom("");
    setTo("");
  };

    const handleDelete = async () => {
      if (!selected) return;
      try {
        await deleteRecordPhoto(selected.id);
        setSelected(null);
        load();
      } catch (err) {
        console.error(err);
      }
    };

    if (!currentPet) {
        return <p className="text-muted">{t("photos.noPet")}</p>;
    }
    if (loading) {
        return <p className="text-muted">{t("common.loading")}</p>;
    }
    if (photos.length === 0) {
        return <p className="text-muted">{t("photos.empty")}</p>;
    }
    return (
      <div className="p-4 sm:p-8">
        <div className="mb-4 flex items-center justify-end">
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition ${filtersOpen || activeFilters > 0 ? "bg-primary text-on-primary" : "bg-surface border border-border text-muted hover:text-fg"}`}
          >
            <SlidersHorizontal size={16} />
            {t("photos.filter")}{activeFilters > 0 ? ` (${activeFilters})` : ""}
          </button>
        </div>

        {filtersOpen && (
          <div className="mb-6 rounded-xl border border-border bg-surface p-4">
            <p className="mb-2 text-sm font-medium text-fg">{t("photos.type")}</p>
            <div className="flex flex-wrap gap-2">
              {RECORD_TYPES.map((type) => (
                <button
                  key={type}
                  className={`px-3 py-1.5 rounded-lg text-sm transition ${types.includes(type) ? "bg-primary text-on-primary" : "bg-ink border border-border text-muted hover:text-fg"}`}
                  onClick={() => toggleType(type)}
                >
                  {type} ({photos.filter((p) => p.record_type === type).length})
                </button>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap items-end gap-4">
              <label className="text-sm text-muted">
                {t("photos.from")}
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  className="mt-1 block rounded-lg border border-border bg-ink px-3 py-1.5 text-fg"
                />
              </label>
              <label className="text-sm text-muted">
                {t("photos.to")}
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  className="mt-1 block rounded-lg border border-border bg-ink px-3 py-1.5 text-fg"
                />
              </label>
              {activeFilters > 0 && (
                <button onClick={clearFilters} className="py-1.5 text-sm text-primary hover:underline">
                  {t("photos.clearFilters")}
                </button>
              )}
            </div>
          </div>
        )}

        {months.length === 0 ? (
          <p className="text-muted">{t("photos.noMatch")}</p>
        ) : (
          months.map(([key, items]) => (
            <section key={key}>
              <h2 className="sticky top-0 z-10 -mx-4 sm:-mx-8 bg-ink/95 px-4 sm:px-8 py-2 text-sm font-semibold text-muted backdrop-blur">
                {new Date(`${key}-01T00:00:00`).toLocaleDateString(dateLocale(), { month: "long", year: "numeric" })}
              </h2>
              <div className="mb-8 mt-2 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {items.map((p) => (
                  <button key={p.id} onClick={() => setSelected(p)}>
                    <img
                      src={`${import.meta.env.VITE_API_URL}/photos/${p.filename}`}
                      className="aspect-square w-full object-cover rounded-lg border border-border hover:opacity-80 transition"
                    />
                  </button>
                ))}
              </div>
            </section>
          ))
        )}
    {selected && (
      <div
        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
        onClick={() => setSelected(null)}
      >
        <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
          <img
            src={`${import.meta.env.VITE_API_URL}/photos/${selected.filename}`}
            className="mx-auto max-h-[70vh] max-w-full rounded-t-xl object-contain"
          />
          <div className="flex items-center justify-between gap-4 rounded-b-xl border border-t-0 border-border bg-surface px-4 py-3">
            <Link to="/records" className="truncate font-medium text-fg transition hover:text-primary">
              {selected.record_title}
            </Link>
            <p className="shrink-0 text-sm text-muted">
              {formatDateLong(selected.record_date)}
            </p>
            <button
              onClick={handleDelete}
              aria-label={t("common.delete")}
              className="shrink-0 rounded-lg p-2 text-danger transition hover:bg-danger/10"
            >
              <Trash2 size={18} />
            </button>
            <button
              onClick={() => setSelected(null)}
              aria-label={t("common.close")}
              className="shrink-0 rounded-lg p-2 text-muted transition hover:bg-hover hover:text-fg"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </div>
    )}
      </div>
    );
}