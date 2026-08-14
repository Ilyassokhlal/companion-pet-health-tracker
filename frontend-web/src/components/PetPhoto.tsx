import { useState } from "react";
import { uploadPhoto } from "../api/pets";
import type { Pet } from "../types";
import { usePets } from "../context/PetContext";



// A React component that displays a pet's photo and allows the user to upload a new photo. It handles the uploading state and any errors that may occur during the upload process.
export default function PetPhoto({ pet }: { pet: Pet }) {
  const {refresh} = usePets();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

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

    // Render the pet photo component. If the pet has a photo_filename, display the image; otherwise, display a placeholder with the first letter of the pet's name. Include an input for uploading a new photo and display any error messages.
    return (
    <div className="flex flex-col items-center">
        {pet.photo_filename ? (
            <img
                src={`${import.meta.env.VITE_API_URL}/photos/${pet.photo_filename}`}
                alt={pet.name}
                className="w-32 h-32 rounded-full object-cover"
            />
        ) : (
            <div className="w-32 h-32 rounded-full bg-gray-300 flex items-center justify-center text-4xl text-white">
                {pet.name.charAt(0).toUpperCase()}
            </div>
        )}
        <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleChange}
            disabled={uploading}
            className="mt-2"
        />
        {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
    </div>
  );
}