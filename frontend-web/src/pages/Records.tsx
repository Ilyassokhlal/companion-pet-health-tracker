import { useState, useEffect, useCallback } from "react";
import { listRecords, deleteRecord, downloadExport } from "../api/records";
import RecordForm from "../components/RecordForm";
import Modal from "../components/ui/Modal";
import { usePets } from "../context/PetContext";
import { RECORD_TYPES } from "../types";
import type { HealthRecord, RecordType } from "../types";
import { Plus, Download, Pencil, Trash2 } from "lucide-react";
import Button from "../components/ui/Button";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { useAuth } from "../auth/AuthContext";
import { formatWeight } from "../units";


// The Records component displays the health records of the current pet. It uses the usePets hook to access the current pet and fetches its health records using the listRecords API function. The component allows filtering of records by type and displays the count of each record type. If there is no current pet, it prompts the user to add a pet first.
export default function Records() {
  const { currentPet } = usePets();
  const { user } = useAuth();
  const unitSystem = user?.unit_system ?? "metric";
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [filter, setFilter] = useState<RecordType | "All">("All");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<HealthRecord | "new" | null>(null);
  const [pendingDelete, setPendingDelete] = useState<HealthRecord | null>(null);

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

  async function handleDelete() {
    if (!pendingDelete) return;
    await deleteRecord(pendingDelete.id);
    setPendingDelete(null);
    load();
  }

  if (!currentPet) {
    return <div className="p-8">Add a pet first.</div>;
  }

  const filteredRecords = filter === "All" ? records : records.filter(r => r.record_type === filter);

  // Each Weight record measured against the previous one by date. The earliest has nothing to compare against, and an unchanged weight gets no arrow at all.
  const weightDeltas = new Map<number, number>();
  const weighed = records
    .filter((r) => r.record_type === "Weight" && r.weight_kg != null)
    .sort((a, b) => a.date.localeCompare(b.date));
  weighed.forEach((r, index) => {
    if (index === 0) return;
    const change = r.weight_kg! - weighed[index - 1].weight_kg!;
    if (change !== 0) weightDeltas.set(r.id, change);
  });

  return (
      <div className="p-4 sm:p-8">
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          className={`px-3 py-1.5 rounded-lg text-sm transition ${filter === "All" ? "bg-primary text-on-primary" : "bg-surface border border-border text-muted hover:text-fg"}`}
          onClick={() => setFilter("All")}
        >
          All ({records.length})
        </button>
        {RECORD_TYPES.map(type => (
          <button
            key={type}
            className={`px-3 py-1.5 rounded-lg text-sm transition ${filter === type ? "bg-primary text-on-primary" : "bg-surface border border-border text-muted hover:text-fg"}`}
            onClick={() => setFilter(type)}
          >
            {type} ({records.filter(r => r.record_type === type).length})
          </button>
        ))}
      </div>
      <div className="flex gap-2 mb-6">
        <Button onClick={() => setEditing("new")} className="flex items-center gap-1.5"><Plus size={16} />Add record</Button>
        <Button variant="secondary" onClick={() => downloadExport(currentPet.id, "zip")} className="flex items-center gap-1.5"><Download size={16} />Data</Button>
        <Button variant="secondary" onClick={() => downloadExport(currentPet.id, "pdf")} className="flex items-center gap-1.5"><Download size={16} />PDF</Button>
      </div>
      <Modal
        open={editing !== null}
        title={editing === "new" ? "Add record" : "Edit record"}
        onClose={() => setEditing(null)}
      >
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
      </Modal>
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
          {r.weight_kg != null && (
            <p className="mt-2">
              <span className="font-medium">{formatWeight(r.weight_kg, unitSystem)}</span>
              {weightDeltas.has(r.id) && (
                <span className="ml-2 text-sm text-muted">
                  {weightDeltas.get(r.id)! > 0 ? "↑" : "↓"} {formatWeight(Math.abs(weightDeltas.get(r.id)!), unitSystem)}
                </span>
              )}
            </p>
          )}
          {r.description && <p className="text-muted mt-2">{r.description}</p>}
          {r.next_due_date && <p className="text-sm text-muted mt-2">Next due {r.next_due_date}</p>}
          <div className="flex gap-2 mt-2">
            <Button onClick={() => setEditing(r)} className="px-3 py-1 text-sm flex items-center gap-1.5"><Pencil size={14} />Edit</Button>
            <Button variant="danger" onClick={() => setPendingDelete(r)} className="px-3 py-1 text-sm flex items-center gap-1.5"><Trash2 size={14} />Delete</Button>
          </div>
        </div>
      ))}
      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete record"
        message={`"${pendingDelete?.title}" will be permanently removed.`}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}
