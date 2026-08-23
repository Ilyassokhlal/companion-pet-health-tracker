import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { usePets } from "../context/PetContext";
import { listPetPhotos, deleteRecordPhoto } from "../api/records";
import type { GalleryPhoto } from "../types";
import { X, Trash2 } from "lucide-react";

// The Photos component displays a gallery of photos associated with the current pet. It fetches the photos from the API, allows users to view individual photos in a modal, and provides functionality to delete photos. The component handles loading states and displays appropriate messages when there are no pets or no photos available.
export default function Photos() {

  const { currentPet } = usePets();
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<GalleryPhoto | null>(null);

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
        return <p className="text-muted">Add a pet first.</p>;
    }
    if (loading) {
        return <p className="text-muted">Loading…</p>;
    }
    if (photos.length === 0) {
        return <p className="text-muted">No photos yet. Attach photos when you add a health record.</p>;
    }
    return (
      <div className="p-4 sm:p-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {photos.map((p) => (
          <button key={p.id} onClick={() => setSelected(p)}>
            <img
              src={`${import.meta.env.VITE_API_URL}/photos/${p.filename}`}
              className="aspect-square w-full object-cover rounded-lg border border-border hover:opacity-80 transition"
            />
          </button>
        ))}
        </div>
    {selected && (
      <div
        className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
        onClick={() => setSelected(null)}
      >
        <div className="max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
          <img
            src={`${import.meta.env.VITE_API_URL}/photos/${selected.filename}`}
            className="mx-auto max-h-[70vh] max-w-full object-contain"
          />
          <div className="flex justify-between items-center mt-4">
            <Link to="/records" className="text-primary hover:underline">
              {selected.record_title}
            </Link>
            <p className="text-muted">{selected.record_date}</p>
            <button
              onClick={handleDelete}
              className="text-danger hover:brightness-125"
            >
              <Trash2 />
            </button>
            <button
              onClick={() => setSelected(null)}
              className="text-muted hover:text-fg"
            >
              <X />
            </button>
          </div>
        </div>
      </div>
    )}
      </div>
    );
}