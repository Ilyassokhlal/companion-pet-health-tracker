import { usePets } from "../context/PetContext";
import { useState, useEffect } from "react";
import { listRecords } from "../api/records";
import type { HealthRecord } from "../types";
import PetForm from "../components/PetForm";
import { deletePet } from "../api/pets";
import PetPhoto from "../components/PetPhoto";
import Button from "../components/ui/Button";

// Formats the age of a pet based on its birth date. If the birth date is null, it returns "Unknown". If the pet is less than 12 months old, it returns the age in months. If the pet is 12 months or older, it returns the age in years.
function formatAge(birthDate: string | null): string {
    if (!birthDate) {
        return "Unknown";
    }
    const birth = new Date(birthDate);
    const now = new Date();
    const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    if (months < 12) {
        return `${months} months`;
    } else {
        const years = Math.floor(months / 12);
        return `${years} years`;
    }
}

// The Dashboard component displays the current pet's information. It uses the usePets hook to access the current pet and loading state. If loading is true, it shows a loading message. If there is no current pet, it prompts the user to add a pet. If a current pet exists, it displays the pet's details such as name, species, breed, age, and weight.
export default function Dashboard() {
  const { currentPet, loading, refresh } = usePets();
  const [showForm, setShowForm] = useState<"add" | "edit" | null>(null);
  const [records, setRecords] = useState<HealthRecord[]>([]);

  useEffect(() => {
    if (!currentPet) {
      setRecords([]);
      return;
    }
    listRecords(currentPet.id).then(setRecords).catch(console.error);
  }, [currentPet]);

  // Handles the deletion of the current pet. It prompts the user for confirmation before proceeding with the deletion. If confirmed, it calls the deletePet API function, removes the current pet ID from local storage, and refreshes the pet list.
  async function handleDelete() {
    if (!currentPet) return;
    if (!confirm(`Delete ${currentPet.name}? Their records and chat history go too. This cannot be undone.`)) return;
    await deletePet(currentPet.id);
    localStorage.removeItem("currentPetId");
    await refresh();
  }

  if (loading) {
    return <div className="p-8">Loading…</div>;
  }
  if (!currentPet) {
    return (
    <div className="p-4 sm:p-8">
        {showForm === "add" ? (
          <PetForm onDone={() => setShowForm(null)} />
        ) : (
          <>
            <p>You haven't added a pet yet.</p>
            <Button onClick={() => setShowForm("add")} className="mt-4">
              Add Pet
            </Button>
          </>
        )}
      </div>
    );
  }

  // Filters and sorts the health records of the current pet based on their next due date. It separates the records into overdue and upcoming categories, allowing for easy display of the pet's health record status.
  const todayStr = new Date().toLocaleDateString("en-CA");
  const dueRecords = records.filter(r => r.next_due_date).sort((a, b) => a.next_due_date!.localeCompare(b.next_due_date!));
  const overdue = dueRecords.filter(r => r.next_due_date! < todayStr);
  const upcoming = dueRecords.filter(r => r.next_due_date! >= todayStr);

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center gap-4">
        <PetPhoto pet={currentPet} />
        <h1 className="text-2xl font-bold">{currentPet.name}</h1>
        <button onClick={() => setShowForm("edit")} className="text-sm text-primary hover:underline">Edit</button>
        <button onClick={handleDelete} className="text-sm text-danger hover:underline">Delete</button>
      </div>
      <dl className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div><dt className="text-sm text-muted">Species</dt><dd>{currentPet.species}</dd></div>
        <div><dt className="text-sm text-muted">Breed</dt><dd>{currentPet.breed ?? "Not set"}</dd></div>
        <div><dt className="text-sm text-muted">Age</dt><dd>{formatAge(currentPet.birth_date)}</dd></div>
        <div><dt className="text-sm text-muted">Weight</dt><dd>{currentPet.weight !== null ? `${currentPet.weight} kg` : "Not set"}</dd></div>
      </dl>
      <section className="mt-8 bg-surface border border-border rounded-xl p-6 shadow-soft">
        <h2 className="text-lg font-semibold mb-3">Due</h2>
        {overdue.length === 0 && upcoming.length === 0 && (
          <p className="text-muted">Nothing due.</p>
        )}
        {overdue.map(r => (
          <p key={r.id} className="text-danger">
            Overdue: {r.title} — {r.next_due_date}
          </p>
        ))}
        {upcoming.map(r => (
          <p key={r.id}>
            {r.title} — {r.next_due_date}
          </p>
        ))}
      </section>
      {showForm === "edit" && (
        <PetForm key={currentPet.id} pet={currentPet} onDone={() => setShowForm(null)} />
      )}
    </div>
  );
}