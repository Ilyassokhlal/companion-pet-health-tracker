import { useState } from "react";
import { createEvent } from "../api/events";
import Button from "./ui/Button";
import Input from "./ui/Input";

interface Props {
  petId: number;
  onDone: (saved: boolean) => void;
}

// Renders a form to create a new event for a pet. Calls onDone(true) if the event is successfully created, onDone(false) if cancelled.
export default function EventForm({ petId, onDone }: Props) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(new Date().toLocaleDateString("en-CA"));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await createEvent({ pet_id: petId, title, due_date: dueDate });
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
        <label className="block">Date</label>
        <Input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          required
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