import { useState, useRef } from "react";
import { uploadPhoto, deletePhoto } from "../api/pets";
import type { Pet } from "../types";
import { usePets } from "../context/PetContext";
import { Camera, X } from "lucide-react";



// A React component that displays a pet's photo and allows the user to upload a new photo. It handles the uploading state and any errors that may occur during the upload process.
export default function PetPhoto({ pet }: { pet: Pet }) {
  const {refresh} = usePets();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewing, setViewing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Handle file input change event. When a file is selected, it uploads the photo for the pet and refreshes the pet list. It also manages the uploading state and error messages.
  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadPhoto(pet.id, file);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  // Handle the removal of the pet's photo. It calls the deletePhoto API function and refreshes the pet list. It also manages the uploading state and error messages.
  const handleRemove = async () => {
    setUploading(true);
    setError("");
    try {
      await deletePhoto(pet.id);
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  // Render the pet photo component. If the pet has a photo_filename, display the image; otherwise, display a placeholder with the first letter of the pet's name. Include an input for uploading a new photo and display any error messages.
  return (
    <div className="relative">

      <div className="group relative w-32 h-32">
        {pet.photo_filename ? (
          <img
            src={`${import.meta.env.VITE_API_URL}/photos/${pet.photo_filename}`}
            alt={pet.name}
            className="w-32 h-32 rounded-full object-cover ring-1 ring-border"
          />
        ) : (
          <div className="w-32 h-32 rounded-full bg-surface border border-border flex items-center justify-center text-4xl text-muted">
            {pet.name.charAt(0).toUpperCase()}
          </div>
        )}
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          disabled={uploading}
          className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white"
        >
          <Camera size={22} />
        </button>
      </div>

      {menuOpen && (
        <div className="absolute z-20 bg-surface border border-border rounded-lg mt-2 p-2 flex flex-col gap-2">
          {pet.photo_filename && (
            <button onClick={() => { setViewing(true); setMenuOpen(false); }} className="text-start px-2 py-1 rounded hover:bg-hover">
              View photo
            </button>
          )}
          <button onClick={() => { inputRef.current?.click(); setMenuOpen(false); }} className="text-start px-2 py-1 rounded hover:bg-hover">
            {pet.photo_filename ? "Replace photo" : "Upload photo"}
          </button>
          {pet.photo_filename && (
            <button onClick={() => { handleRemove(); setMenuOpen(false); }} className="text-start px-2 py-1 rounded hover:bg-hover text-danger">
              Remove photo
            </button>
          )}
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 z-30 bg-black/60 flex items-center justify-center" onClick={() => setViewing(false)}>
          <div className="relative" onClick={e => e.stopPropagation()}>
            <img
              src={`${import.meta.env.VITE_API_URL}/photos/${pet.photo_filename}`}
              alt={pet.name}
              className="max-w-[90vw] max-h-[85vh] rounded-lg object-contain"
            />
            <button
              onClick={() => setViewing(false)}
              className="absolute top-2 end-2 text-white"
              aria-label="Close"
            >
              <X size={22} />
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-danger text-sm mt-1">{error}</p>}

      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleChange}
        ref={inputRef}
        className="hidden"
      />
    </div>
  );
}
