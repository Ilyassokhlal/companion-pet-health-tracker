import { useState } from "react";
import { usePets } from "../context/PetContext";
import { createPet, updatePet } from "../api/pets";
import type { Pet } from "../types";


// Props for the PetForm component, which can optionally take a pet object for editing and a callback function to be called when the form submission is done.
interface Props {
  pet?: Pet;
  onDone: () => void;
}

// The PetForm component provides a form for adding or editing a pet. It manages the state for the pet's name, species, breed, birth date, and weight. Upon submission, it calls the appropriate API function to create or update the pet and refreshes the pet list.
export default function PetForm({ pet, onDone }: Props) {
// Manages the state for the pet form fields, including name, species, breed, birth date, weight, error messages, and submission status. It uses the usePets hook to refresh the pet list after a successful submission.
    const [name, setName] = useState(pet?.name ?? "");
    const [species, setSpecies] = useState(pet?.species ?? "Dog");
    const [breed, setBreed] = useState(pet?.breed ?? "");
    const [birthDate, setBirthDate] = useState(pet?.birth_date ?? "");
    const [weight, setWeight] = useState(pet?.weight?.toString() ?? "");
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const { refresh } = usePets();

// Handles the form submission for creating or updating a pet. It constructs a payload from the form state and calls the appropriate API function based on whether a pet is being edited or created. It also manages loading and error states, and calls the onDone callback upon successful submission.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    const payload = {
      name,
      species,
        breed: breed || null,
        birth_date: birthDate || null,
        weight: weight ? parseFloat(weight) : null,
    };
    try {
      if (pet) {
        await updatePet(pet.id, payload);
      } else {
        await createPet(payload);
      }
      await refresh();
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };
  // Renders a form for adding or editing a pet. It includes fields for name, species, breed, birth date, and weight. The form handles submission by calling the appropriate API function to create or update the pet, and it manages loading and error states.
    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded">
            <div>
                <label className="block mb-1">Name</label>
                <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                    className="w-full p-2 border border-gray-300 rounded"
                />
            </div>
            <div>
                <label className="block mb-1">Species</label>
                <select
                    value={species}
                    onChange={e => setSpecies(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded"
                >
                    <option value="Dog">Dog</option>
                    <option value="Cat">Cat</option>
                </select>
            </div>
            <div>
                <label className="block mb-1">Breed</label>
                <input
                    type="text"
                    value={breed}
                    onChange={e => setBreed(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded"
                />
            </div>
            <div>
                <label className="block mb-1">Birth Date</label>
                <input
                    type="date"
                    value={birthDate}
                    onChange={e => setBirthDate(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded"
                />
            </div>
            <div>
                <label className="block mb-1">Weight (kg)</label>
                <input
                    type="number"
                    step="0.1"
                    value={weight}
                    onChange={e => setWeight(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded"
                />
            </div>
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <div className="flex space-x-2">
                <button
                    type="submit"
                    disabled={submitting}
                    className="p-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
                >
                    {submitting ? "Saving..." : "Save"}
                </button>
                <button
                    type="button"
                    onClick={onDone}
                    className="p-2 bg-gray-300 text-black rounded"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
}