import { useState, useRef } from "react";
import { uploadMyPhoto, deleteMyPhoto } from "../api/auth";
import { useAuth } from "../auth/AuthContext";
import { Camera, X } from "lucide-react";

// The signed-in user's avatar, with the same View / Replace / Remove overlay as PetPhoto.
export default function UserPhoto() {
  const { user, refreshUser } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewing, setViewing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      await uploadMyPhoto(file);
      await refreshUser();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async () => {
    setUploading(true);
    setError("");
    try {
      await deleteMyPhoto();
      await refreshUser();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  if (!user) return null;
  return (
    <div className="relative">
      <div className="group relative w-24 h-24">
        {user.photo_filename ? (
          <img
            src={`${import.meta.env.VITE_API_URL}/photos/${user.photo_filename}`}
            alt={user.username}
            className="w-24 h-24 rounded-full object-cover ring-1 ring-border"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-surface border border-border flex items-center justify-center text-3xl text-muted">
            {user.username.charAt(0).toUpperCase()}
          </div>
        )}
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          disabled={uploading}
          className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white"
        >
          <Camera size={20} />
        </button>
      </div>

      {menuOpen && (
        <div className="absolute z-20 bg-surface border border-border rounded-lg mt-2 p-2 flex flex-col gap-2">
          {user.photo_filename && (
            <button type="button" onClick={() => { setViewing(true); setMenuOpen(false); }} className="text-start px-2 py-1 rounded hover:bg-hover">
              View photo
            </button>
          )}
          <button type="button" onClick={() => { inputRef.current?.click(); setMenuOpen(false); }} className="text-start px-2 py-1 rounded hover:bg-hover">
            {user.photo_filename ? "Replace photo" : "Upload photo"}
          </button>
          {user.photo_filename && (
            <button type="button" onClick={() => { handleRemove(); setMenuOpen(false); }} className="text-start px-2 py-1 rounded hover:bg-hover text-danger">
              Remove photo
            </button>
          )}
        </div>
      )}

      {viewing && (
        <div className="fixed inset-0 z-30 bg-black/60 flex items-center justify-center" onClick={() => setViewing(false)}>
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <img
              src={`${import.meta.env.VITE_API_URL}/photos/${user.photo_filename}`}
              alt={user.username}
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