import { useCallback, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";

import { useAuth } from "@/auth/AuthContext";
import { usePets } from "@/context/PetContext";
import { listWalks, createWalk, updateWalk, deleteWalk } from "@/api/walks";
import type { Walk } from "@/types";
import { formatDate } from "@/dates";
import { distanceUnit, formatDistance, formatDuration, fromKm, toKm } from "@/units";
import DateField from "@/components/ui/DateField";
import Button from "@/components/ui/Button";

export default function Walks() {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { currentPet } = usePets();
  const unitSystem = user?.unit_system ?? "metric";

  const [walks, setWalks] = useState<Walk[]>([]);
  const [editing, setEditing] = useState<Walk | "new" | null>(null);
  const [date, setDate] = useState("");
  const [duration, setDuration] = useState("");
  const [distance, setDistance] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!currentPet) {
      setWalks([]);
      return;
    }
    listWalks(currentPet.id).then(setWalks).catch(console.error);
  }, [currentPet]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Distance is stored in kilometres, so the form converts on the way in and on the way out.
  function open(walk: Walk | "new") {
    setError(null);
    if (walk === "new") {
      setDate(new Date().toLocaleDateString("en-CA"));
      setDuration("");
      setDistance("");
      setNotes("");
    } else {
      setDate(walk.date);
      setDuration(String(walk.duration_minutes));
      setDistance(walk.distance_km === null ? "" : String(fromKm(walk.distance_km, unitSystem)));
      setNotes(walk.notes ?? "");
    }
    setEditing(walk);
  }

  async function save() {
    if (!currentPet || editing === null) return;
    const minutes = Number(duration);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      setError("Enter how long the walk lasted, in minutes.");
      return;
    }
    const typed = distance.trim() === "" ? null : Number(distance);
    if (typed !== null && (!Number.isFinite(typed) || typed < 0)) {
      setError("Distance must be a number.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        date,
        duration_minutes: Math.round(minutes),
        distance_km: typed === null ? null : toKm(typed, unitSystem),
        notes: notes.trim() === "" ? null : notes.trim(),
      };
      if (editing === "new") await createWalk(currentPet.id, payload);
      else await updateWalk(editing.id, payload);
      setEditing(null);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(walk: Walk) {
    Alert.alert("Delete walk", "This walk will be permanently removed.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteWalk(walk.id);
          setEditing(null);
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

  return (
    <View className="flex-1 bg-ink">
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16 }}>
        <Text className="mb-1 text-2xl font-bold text-fg">Walks</Text>
        <Text className="mb-6 text-sm text-muted">{currentPet.name}</Text>

        <Pressable
          onPress={() => open("new")}
          className="mb-6 items-center rounded-lg bg-primary px-4 py-3 active:opacity-70"
        >
          <Text className="font-semibold text-on-primary">Log a walk</Text>
        </Pressable>

        {walks.length === 0 ? (
          <Text className="text-muted">No walks logged yet.</Text>
        ) : (
          walks.map((walk) => (
            <Pressable
              key={walk.id}
              onPress={() => open(walk)}
              className="mb-3 rounded-xl border border-border bg-surface p-4 active:opacity-70"
            >
              <View className="flex-row items-center justify-between gap-3">
                <Text className="font-semibold text-fg">{formatDate(walk.date)}</Text>
                <Text className="text-sm text-muted">{formatDuration(walk.duration_minutes)}</Text>
              </View>
              {walk.distance_km !== null ? (
                <Text className="mt-1 text-sm text-muted">
                  {formatDistance(walk.distance_km, unitSystem)}
                </Text>
              ) : null}
              {walk.notes ? <Text className="mt-2 text-sm text-fg">{walk.notes}</Text> : null}
            </Pressable>
          ))
        )}
      </ScrollView>

      <Modal visible={editing !== null} animationType="slide" transparent onRequestClose={() => setEditing(null)}>
        <View className="flex-1 justify-end bg-black/70">
          <View className="rounded-t-2xl border-t border-border bg-ink p-5">
            <Text className="mb-4 text-lg font-semibold text-fg">
              {editing === "new" ? "Log a walk" : "Edit walk"}
            </Text>
            {error ? <Text className="mb-3 text-sm text-danger">{error}</Text> : null}

            <View className="mb-4">
              <DateField label="Date" value={date} onChange={setDate} maximumDate={new Date()} />
            </View>

            <Text className="mb-1 text-sm text-muted">Duration (minutes)</Text>
            <TextInput
              value={duration}
              onChangeText={setDuration}
              keyboardType="number-pad"
              placeholder="45"
              className="mb-4 rounded-lg border border-border bg-surface px-4 py-3 text-fg"
            />

            <Text className="mb-1 text-sm text-muted">{`Distance (${distanceUnit(unitSystem)}, optional)`}</Text>
            <TextInput
              value={distance}
              onChangeText={setDistance}
              keyboardType="decimal-pad"
              placeholder="3.2"
              className="mb-4 rounded-lg border border-border bg-surface px-4 py-3 text-fg"
            />

            <Text className="mb-1 text-sm text-muted">Notes (optional)</Text>
            <TextInput
              value={notes}
              onChangeText={setNotes}
              multiline
              className="mb-5 min-h-20 rounded-lg border border-border bg-surface px-4 py-3 text-fg"
            />

            <Button label={saving ? "Saving…" : "Save"} onPress={save} disabled={saving} />

            <View className="mt-3 flex-row items-center justify-between">
              <Pressable onPress={() => setEditing(null)} className="px-2 py-2">
                <Text className="text-muted">Cancel</Text>
              </Pressable>
              {editing !== "new" && editing !== null ? (
                <Pressable onPress={() => confirmDelete(editing)} className="px-2 py-2">
                  <Text className="text-danger">Delete</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}