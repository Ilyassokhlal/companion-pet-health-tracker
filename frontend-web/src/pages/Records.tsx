import { useState, useEffect, useCallback } from "react";
import { listRecords, deleteRecord, downloadExport } from "../api/records";
import RecordForm from "../components/RecordForm";
import { usePets } from "../context/PetContext";
import { RECORD_TYPES } from "../types";
import type { HealthRecord, RecordType } from "../types";
import Button from "../components/ui/Button";

// The Records component displays the health records of the current pet. It uses the usePets hook to access the current pet and fetches its health records using the listRecords API function. The component allows filtering of records by type and displays the count of each record type. If there is no current pet, it prompts the user to add a pet first.
export default function Records() {
  const { currentPet } = usePets();
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [filter, setFilter] = useState<RecordType | "All">("All");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<HealthRecord | "new" | null>(null);

  const load = useCallback(() => {
    if (!currentPet) {
      setRecords([]);
      return;
    }
    setLoading(true);
    listRecords(currentPet.id)
      .then(setRecords)
      .finally(() => setLoading(false));
  }, [currentPet]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(record: HealthRecord) {
    if (!confirm(`Delete "${record.title}"?`)) return;
    await deleteRecord(record.id);
    load();
  }

  if (!currentPet) {
    return <div className="p-8">Add a pet first.</div>;
  }

  const filteredRecords = filter === "All" ? records : records.filter(r => r.record_type === filter);

  return (
      <div className="p-4 sm:p-8">
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          className={`px-3 py-1.5 rounded-lg text-sm transition ${filter === "All" ? "bg-primary text-white" : "bg-surface border border-border text-muted hover:text-fg"}`}
          onClick={() => setFilter("All")}
        >
          All ({records.length})
        </button>
        {RECORD_TYPES.map(type => (
          <button
            key={type}
            className={`px-3 py-1.5 rounded-lg text-sm transition ${filter === type ? "bg-primary text-white" : "bg-surface border border-border text-muted hover:text-fg"}`}
            onClick={() => setFilter(type)}
          >
            {type} ({records.filter(r => r.record_type === type).length})
          </button>
        ))}
      </div>
      <div className="flex gap-2 mb-6">
        <Button onClick={() => setEditing("new")}>Add record</Button>
        <Button variant="secondary" onClick={() => downloadExport(currentPet.id, "csv")}>Export CSV</Button>
        <Button variant="secondary" onClick={() => downloadExport(currentPet.id, "pdf")}>Export PDF</Button>
      </div>
      {editing && (
        <RecordForm
          key={editing === "new" ? "new" : editing.id}
          petId={currentPet.id}
          record={editing === "new" ? undefined : editing}
          onDone={(saved) => {
            setEditing(null);
            if (saved) load();
          }}
        />
      )}
      {loading && <p className="text-muted">Loading…</p>}
      {!loading && filteredRecords.length === 0 && (
        <p className="text-muted">No records yet.</p>
      )}
      {[...filteredRecords].sort((a, b) => b.date.localeCompare(a.date)).map(r => (
        <div key={r.id} className="bg-surface border border-border rounded-xl p-5 mb-3 shadow-soft">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-semibold">{r.title}</h3>
            <span className="text-sm text-muted shrink-0">{r.date}</span>
          </div>
          <p className="text-sm text-primary mt-1">{r.record_type}</p>
          {r.description && <p className="text-muted mt-2">{r.description}</p>}
          {r.next_due_date && <p className="text-sm text-muted mt-2">Next due {r.next_due_date}</p>}
          <div className="flex gap-2 mt-2">
            <Button variant="secondary" onClick={() => setEditing(r)} className="px-3 py-1 text-sm">Edit</Button>
            <Button variant="danger" onClick={() => handleDelete(r)} className="px-3 py-1 text-sm">Delete</Button>
          </div>
        </div>
      ))}
    </div>
  );
}
