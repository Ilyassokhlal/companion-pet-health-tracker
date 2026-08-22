import { useState } from "react";
import { usePets } from "../context/PetContext";
import { createPet, updatePet } from "../api/pets";
import type { Pet } from "../types";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";


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
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block mb-1">Name</label>
                <Input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    required
                />
            </div>
            <div>
                <label className="block mb-1">Species</label>
                <select
                    value={species}
                    onChange={e => setSpecies(e.target.value)}
                    className="w-full rounded-lg bg-ink border border-border px-3 py-2.5 text-fg focus:border-primary focus:outline-none"
                >
                    <option value="Dog">Dog</option>
                    <option value="Cat">Cat</option>
                </select>
            </div>
            <div>
                <label className="block mb-1">Breed</label>
                <Input
                    type="text"
                    value={breed}
                    onChange={e => setBreed(e.target.value)}
                />
            </div>
            <div>
                <label className="block mb-1">Birth Date</label>
                <Input
                    type="date"
                    value={birthDate}
                    onChange={e => setBirthDate(e.target.value)}
                />
            </div>
            <div>
                <label className="block mb-1">Weight (kg)</label>
                <Input
                    type="number"
                    step="0.1"
                    value={weight}
                    onChange={e => setWeight(e.target.value)}
                />
            </div>
            {error && <p className="text-danger text-sm">{error}</p>}
            <div className="flex space-x-2">
                <Button type="submit" disabled={submitting}>
                    {submitting ? "Saving..." : "Save"}
                </Button>
                <Button type="button" variant="secondary" onClick={onDone}>
                    Cancel
                </Button>
            </div>
        </form>
    );
}