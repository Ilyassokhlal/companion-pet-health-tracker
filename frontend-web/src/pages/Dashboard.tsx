import { usePets } from "../context/PetContext";
import { useState, useEffect } from "react";
import { listRecords } from "../api/records";
import type { HealthRecord } from "../types";
import PetForm from "../components/PetForm";
import { deletePet } from "../api/pets";
import PetPhoto from "../components/PetPhoto";

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
      <div className="p-8">
        {showForm === "add" ? (
          <PetForm onDone={() => setShowForm(null)} />
        ) : (
          <>
            <p>You haven't added a pet yet.</p>
            <button onClick={() => setShowForm("add")} className="mt-4 p-2 bg-blue-500 text-white rounded">
              Add Pet
            </button>
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
    <div className="p-8">
      <div className="flex items-center gap-4">
        <PetPhoto pet={currentPet} />
        <h1 className="text-2xl font-bold">{currentPet.name}</h1>
        <button onClick={() => setShowForm("edit")} className="text-sm text-blue-600 hover:underline">Edit</button>
                <button onClick={handleDelete} className="text-sm text-red-600 hover:underline">Delete</button>
      </div>
      <p>Species: {currentPet.species}</p>
      <p>Breed: {currentPet.breed ?? "Not set"}</p>
      <p>Age: {formatAge(currentPet.birth_date)}</p>
            <p>Weight: {currentPet.weight !== null ? `${currentPet.weight} kg` : "Not set"}</p>
      <section className="mt-6">
        <h2 className="text-lg font-semibold">Due</h2>
        {overdue.length === 0 && upcoming.length === 0 && (
          <p className="text-gray-500">Nothing due.</p>
        )}
        {overdue.map(r => (
          <p key={r.id} className="text-red-500">
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