import { useState } from "react";
import { Text, View } from "react-native";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import DateField from "@/components/ui/DateField";
import { createEvent } from "@/api/events";

interface Props {
  petId: number;
  onDone: (saved: boolean) => void;
}

// Schedules something that no health record generated — a vet appointment, a grooming visit. Follow-ups and weight check-ins are created by the backend instead, so this form only ever produces an Appointment.
export default function EventForm({ petId, onDone }: Props) {
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState(new Date().toLocaleDateString("en-CA"));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
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
  }

  return (
    <View className="gap-4">
      {error ? <Text className="text-sm text-danger">{error}</Text> : null}

      <View>
        <Text className="mb-1 text-sm text-muted">Title</Text>
        <Input value={title} onChangeText={setTitle} placeholder="Title" />
      </View>

      <DateField label="Date" value={dueDate} onChange={setDueDate} />

      <Button label="Schedule" onPress={handleSubmit} loading={submitting} />
      <Button label="Cancel" variant="secondary" onPress={() => onDone(false)} />
    </View>
  );
}