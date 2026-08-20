import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import DateField from "@/components/ui/DateField";
import { createRecord, updateRecord } from "@/api/records";
import { RECORD_TYPES } from "@/types";
import type { HealthRecord, RecordType } from "@/types";

interface Props {
  petId: number;
  record?: HealthRecord;
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

  async function handleSubmit() {
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
  }

  return (
    <View className="gap-4">
      {error ? <Text className="text-sm text-danger">{error}</Text> : null}

      <View>
        <Text className="mb-1 text-sm text-muted">Title</Text>
        <Input value={title} onChangeText={setTitle} placeholder="Title" />
      </View>

      <View>
        <Text className="mb-1 text-sm text-muted">Record type</Text>
        <View className="flex-row flex-wrap gap-2">
          {RECORD_TYPES.map((type) => (
            <Pressable
              key={type}
              onPress={() => setRecordType(type)}
              className={`rounded-lg px-3 py-2 ${
                recordType === type ? "bg-primary" : "border border-border bg-ink"
              }`}
            >
              <Text className="text-sm text-fg">{type}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <DateField label="Date" value={date} onChange={setDate} />

      <View>
        <Text className="mb-1 text-sm text-muted">Description</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
          placeholder="Optional"
          placeholderTextColor="#9c93b8"
          className="min-h-24 w-full rounded-lg border border-border bg-ink px-4 py-3 text-fg"
        />
      </View>

      <DateField label="Next due date" value={nextDueDate} onChange={setNextDueDate} clearable />

      <Button label={record ? "Save" : "Add record"} onPress={handleSubmit} loading={submitting} />
      <Button label="Cancel" variant="secondary" onPress={() => onDone(false)} />
    </View>
  );
}