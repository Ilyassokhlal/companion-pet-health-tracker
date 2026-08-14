import { useState } from "react";
import { createRecord, updateRecord } from "../api/records";
import { RECORD_TYPES } from "../types";
import type { HealthRecord, RecordType } from "../types";

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
      {error && <p className="text-red-500">{error}</p>}
      <div>
        <label className="block">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="border p-2 w-full"
        />
      </div>
      <div>
        <label className="block">Record Type</label>
        <select
          value={recordType}
          onChange={(e) => setRecordType(e.target.value as RecordType)}
          className="border p-2 w-full"
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
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className="border p-2 w-full"
        />
      </div>
      <div>
        <label className="block">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="border p-2 w-full"
        />
      </div>
      <div>
        <label className="block">Next Due Date</label>
        <input
          type="date"
          value={nextDueDate}
          onChange={(e) => setNextDueDate(e.target.value)}
          className="border p-2 w-full"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Save
        </button>
        <button
          type="button"
          onClick={() => onDone(false)}
          className="px-4 py-2 bg-gray-500 text-white rounded"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}