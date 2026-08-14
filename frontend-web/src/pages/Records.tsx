import { useState, useEffect, useCallback } from "react";
import { listRecords, deleteRecord, downloadExport } from "../api/records";
import RecordForm from "../components/RecordForm";
import { usePets } from "../context/PetContext";
import { RECORD_TYPES } from "../types";
import type { HealthRecord, RecordType } from "../types";

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
    <div className="p-8">
      <div className="flex gap-2 mb-4">
        <button
          className={`px-4 py-2 rounded ${filter === "All" ? "bg-blue-500 text-white" : "bg-gray-200"}`}
          onClick={() => setFilter("All")}
        >
          All ({records.length})
        </button>
        {RECORD_TYPES.map(type => (
          <button
            key={type}
            className={`px-4 py-2 rounded ${filter === type ? "bg-blue-500 text-white" : "bg-gray-200"}`}
            onClick={() => setFilter(type)}
          >
            {type} ({records.filter(r => r.record_type === type).length})
          </button>
        ))}
      </div>
      <button onClick={() => setEditing("new")} className="mb-4 px-4 py-2 bg-blue-500 text-white rounded">
        Add record
      </button>
      <button onClick={() => downloadExport(currentPet.id, "csv")} className="mb-4 ml-2 px-4 py-2 bg-gray-200 rounded">
        Export CSV
      </button>
      <button onClick={() => downloadExport(currentPet.id, "pdf")} className="mb-4 ml-2 px-4 py-2 bg-gray-200 rounded">
        Export PDF
      </button>
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
      {loading && <p>Loading…</p>}
      {!loading && filteredRecords.length === 0 && (
        <p className="text-gray-500">No records yet.</p>
      )}
      {[...filteredRecords].sort((a, b) => b.date.localeCompare(a.date)).map(r => (
        <div key={r.id} className="border p-4 mb-2 rounded">
          <h3 className="font-bold">{r.title}</h3>
          <p>Type: {r.record_type}</p>
          <p>Date: {r.date}</p>
          {r.description && <p>Description: {r.description}</p>}
          {r.next_due_date && <p>Next Due Date: {r.next_due_date}</p>}
          <div className="flex gap-2 mt-2">
            <button onClick={() => setEditing(r)} className="px-4 py-2 bg-yellow-500 text-white rounded">Edit</button>
            <button onClick={() => handleDelete(r)} className="px-4 py-2 bg-red-500 text-white rounded">Delete</button>
          </div>
        </div>
      ))}
    </div>
  );
}
