import { useCallback, useEffect, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Button from "@/components/ui/Button";
import RecordForm from "@/components/RecordForm";
import { usePets } from "@/context/PetContext";
import { listRecords, deleteRecord } from "@/api/records";
import { RECORD_TYPES } from "@/types";
import type { HealthRecord, RecordType } from "@/types";

export default function Records() {
  const { currentPet } = usePets();
  const insets = useSafeAreaInsets();
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
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentPet]);

  useEffect(() => {
    load();
  }, [load]);

  function confirmDelete(record: HealthRecord) {
    Alert.alert("Delete record", `"${record.title}" will be permanently removed.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteRecord(record.id);
          load();
        },
      },
    ]);
  }

  if (!currentPet) {
    return (
      <View className="flex-1 items-center justify-center bg-ink px-6">
        <Text className="text-center text-muted">Add a pet first.</Text>
      </View>
    );
  }

  const filtered =
    filter === "All" ? records : records.filter((r) => r.record_type === filter);
  const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <ScrollView
      className="flex-1 bg-ink"
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16 }}
    >
      <View className="mb-4 flex-row flex-wrap gap-2">
        <Pressable
          onPress={() => setFilter("All")}
          className={`rounded-lg px-3 py-1.5 ${
            filter === "All" ? "bg-primary" : "border border-border bg-surface"
          }`}
        >
          <Text className="text-sm text-fg">All ({records.length})</Text>
        </Pressable>
        {RECORD_TYPES.map((type) => (
          <Pressable
            key={type}
            onPress={() => setFilter(type)}
            className={`rounded-lg px-3 py-1.5 ${
              filter === type ? "bg-primary" : "border border-border bg-surface"
            }`}
          >
            <Text className="text-sm text-fg">
              {type} ({records.filter((r) => r.record_type === type).length})
            </Text>
          </Pressable>
        ))}
      </View>

      <View className="mb-6">
        <Button label="Add record" onPress={() => setEditing("new")} />
      </View>

      {loading ? <Text className="text-muted">Loading…</Text> : null}

      {!loading && sorted.length === 0 ? (
        <Text className="text-muted">No records yet.</Text>
      ) : null}

      {sorted.map((r) => (
        <View key={r.id} className="mb-3 rounded-xl border border-border bg-surface p-5">
          <View className="flex-row items-baseline justify-between gap-3">
            <Text numberOfLines={1} className="flex-1 font-semibold text-fg">
              {r.title}
            </Text>
            <Text className="shrink-0 text-sm text-muted">{r.date}</Text>
          </View>

          <Text className="mt-1 text-sm text-primary">{r.record_type}</Text>

          {r.description ? <Text className="mt-2 text-muted">{r.description}</Text> : null}

          {r.next_due_date ? (
            <Text className="mt-2 text-sm text-muted">Next due {r.next_due_date}</Text>
          ) : null}

          <View className="mt-3 flex-row gap-4">
            <Pressable onPress={() => setEditing(r)}>
              <Text className="text-sm text-primary">Edit</Text>
            </Pressable>
            <Pressable onPress={() => confirmDelete(r)}>
              <Text className="text-sm text-danger">Delete</Text>
            </Pressable>
          </View>
        </View>
      ))}

      <Modal
        visible={editing !== null}
        animationType="slide"
        onRequestClose={() => setEditing(null)}
      >
        <ScrollView
          className="flex-1 bg-ink"
          contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16 }}
        >
          {editing ? (
            <RecordForm
              key={editing === "new" ? "new" : editing.id}
              petId={currentPet.id}
              record={editing === "new" ? undefined : editing}
              onDone={(saved) => {
                setEditing(null);
                if (saved) load();
              }}
            />
          ) : null}
        </ScrollView>
      </Modal>
    </ScrollView>
  );
}