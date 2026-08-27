import { useState } from "react";
import { usePets } from "../context/PetContext";
import { createPet, updatePet } from "../api/pets";
import type { Pet } from "../types";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { WEIGHT_FREQUENCIES } from "../types";
import type { WeightFrequency } from "../types";
import { useAuth } from "../auth/AuthContext";
import { fromKg, toKg, weightUnit } from "../units";


// Props for the PetForm component, which can optionally take a pet object for editing and a callback function to be called when the form submission is done.
interface Props {
  pet?: Pet;
  onDone: () => void;
}

// The PetForm component provides a form for adding or editing a pet. It manages the state for the pet's name, species, breed, birth date, and weight. Upon submission, it calls the appropriate API function to create or update the pet and refreshes the pet list.
export default function PetForm({ pet, onDone }: Props) {
// Manages the state for the pet form fields, including name, species, breed, birth date, weight, error messages, and submission status. It uses the usePets hook to refresh the pet list after a successful submission.
    const { user } = useAuth();
    const unitSystem = user?.unit_system ?? "metric";
    const unit = weightUnit(unitSystem);
    const [name, setName] = useState(pet?.name ?? "");
    const [species, setSpecies] = useState(pet?.species ?? "Dog");
    const [breed, setBreed] = useState(pet?.breed ?? "");
    const [birthDate, setBirthDate] = useState(pet?.birth_date ?? "");
    const [weight, setWeight] = useState(pet?.weight != null ? String(fromKg(pet.weight, unitSystem)) : "");
    const [trackWeight, setTrackWeight] = useState(pet?.weight_tracking_enabled ?? false);
    const [frequency, setFrequency] = useState<WeightFrequency>(pet?.weight_frequency ?? "monthly");
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
        weight: weight ? toKg(parseFloat(weight), unitSystem) : null,
        weight_tracking_enabled: trackWeight,
        weight_frequency: frequency,
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
                <label className="block mb-1">Weight ({unit})</label>
                <Input
                    type="number"
                    step="0.1"
                    min="0"
                    value={weight}
                    onChange={e => setWeight(e.target.value)}
                />
            </div>
            <label className="flex items-center gap-2">
                <input
                    type="checkbox"
                    checked={trackWeight}
                    onChange={e => setTrackWeight(e.target.checked)}
                    className="accent-primary"
                />
                <span>Track this pet's weight</span>
            </label>
            {trackWeight && (
                <div>
                    <label className="block mb-1">Check in</label>
                    <select
                        value={frequency}
                        onChange={e => setFrequency(e.target.value as WeightFrequency)}
                        className="w-full rounded-lg bg-ink border border-border px-3 py-2.5 text-fg focus:border-primary focus:outline-none"
                    >
                        {WEIGHT_FREQUENCIES.map(f => (
                            <option key={f} value={f}>
                                {f === "weekly" ? "Every week" : f === "biweekly" ? "Every two weeks" : "Every month"}
                            </option>
                        ))}
                    </select>
                </div>
            )}
            {error && <p className="text-danger text-sm">{error}</p>}
            <div className="flex gap-2">
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