import { useState } from "react";
import { createRecord, updateRecord } from "../api/records";
import { RECORD_TYPES } from "../types";
import type { HealthRecord, RecordType } from "../types";
import Button from "./ui/Button";
import Input from "./ui/Input";

interface Props {
  petId: number;
  record?: HealthRecord;   // present = edit mode
  onDone: (saved: boolean) => void;
}

export default function RecordForm({ petId, record, onDone }: Props) {
  const [title, setTitle] = useState(record?.title || "");
  const [recordType, setRecordType] = useState<RecordType>(record?.record_type || "Vaccination");
  const [date, setDate] = useState(record?.date || new Date().toLocaleDateString("en-CA"));
  const [description, setDescription] = useState(record?.description || "");
  const [nextDueDate, setNextDueDate] = useState(record?.next_due_date || "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const payload = {
      title,
      record_type: recordType,
      date,
      description: description || null,
      next_due_date: nextDueDate || null,
    };
    try {
      if (record) {
        await updateRecord(record.id, payload);
      } else {
        await createRecord(petId, payload);
      }
      onDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-danger text-sm">{error}</p>}
      <div>
        <label className="block">Title</label>
        <Input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block">Record Type</label>
        <select
          value={recordType}
          onChange={(e) => setRecordType(e.target.value as RecordType)}
          className="w-full rounded-lg bg-ink border border-border px-3 py-2.5 text-fg focus:border-primary focus:outline-none"
        >
          {RECORD_TYPES.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block">Date</label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-lg bg-ink border border-border px-3 py-2.5 text-fg placeholder:text-muted transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>
      <div>
        <label className="block">Next Due Date</label>
        <Input
          type="date"
          value={nextDueDate}
          onChange={(e) => setNextDueDate(e.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Save"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => onDone(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}