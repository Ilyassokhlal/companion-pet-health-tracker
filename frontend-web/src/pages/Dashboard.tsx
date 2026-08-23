import { usePets } from "../context/PetContext";
import { useState, useEffect } from "react";
import { listRecords } from "../api/records";
import type { HealthRecord } from "../types";
import PetForm from "../components/PetForm";
import Modal from "../components/ui/Modal";
import { deletePet } from "../api/pets";
import { Pencil, Trash2 } from "lucide-react";
import PetPhoto from "../components/PetPhoto";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";

// Formats a pet's age: days under one month, months under one year, then years.
function formatAge(birthDate: string | null): string {
    if (!birthDate) {
        return "Unknown";
    }
    const birth = new Date(`${birthDate}T00:00:00`);
    const now = new Date();
    let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
    if (now.getDate() < birth.getDate()) {
        months--;
    }
    if (months < 1) {
        const days = Math.floor((now.getTime() - birth.getTime()) / 86400000);
        return days === 1 ? "1 day" : `${days} days`;
    }
    if (months < 12) {
        return months === 1 ? "1 month" : `${months} months`;
    }
    const years = Math.floor(months / 12);
    return years === 1 ? "1 year" : `${years} years`;
}

// The Dashboard component displays the current pet's information. It uses the usePets hook to access the current pet and loading state. If loading is true, it shows a loading message. If there is no current pet, it prompts the user to add a pet. If a current pet exists, it displays the pet's details such as name, species, breed, age, and weight.
export default function Dashboard() {
  const { currentPet, loading, refresh, addPetOpen, setAddPetOpen } = usePets();
  const [showForm, setShowForm] = useState<"edit" | null>(null);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

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
    setConfirmingDelete(false);
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
        <p className="text-muted">You haven't added a pet yet.</p>
        <Button onClick={() => setAddPetOpen(true)} className="mt-4">
          Add Pet
        </Button>
        <Modal open={addPetOpen} title="Add pet" onClose={() => setAddPetOpen(false)}>
          <PetForm onDone={() => setAddPetOpen(false)} />
        </Modal>
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
      <div className="flex flex-wrap items-center gap-4">
        <PetPhoto pet={currentPet} />
        <h1 className="text-2xl font-bold">{currentPet.name}</h1>
        <div className="flex gap-2">
          <Button onClick={() => setShowForm("edit")} className="inline-flex items-center gap-2">
            <Pencil size={16} />
            Edit
          </Button>
          <Button variant="danger" onClick={() => setConfirmingDelete(true)} className="inline-flex items-center gap-2">
            <Trash2 size={16} />
            Delete
          </Button>
        </div>
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
      <Modal open={showForm === "edit"} title={`Edit ${currentPet.name}`} onClose={() => setShowForm(null)}>
        <PetForm key={currentPet.id} pet={currentPet} onDone={() => setShowForm(null)} />
      </Modal>
      <Modal open={addPetOpen} title="Add pet" onClose={() => setAddPetOpen(false)}>
        <PetForm key="add" onDone={() => setAddPetOpen(false)} />
      </Modal>
      <ConfirmDialog
        open={confirmingDelete}
        title={`Delete ${currentPet.name}?`}
        message="Their health records, photos and chat history are deleted too. This cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </div>
  );
}