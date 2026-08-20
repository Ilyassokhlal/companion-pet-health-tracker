import { useCallback, useState } from "react";
import { Alert, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";

import { usePets } from "@/context/PetContext";
import { listRecords } from "@/api/records";
import { deletePet } from "@/api/pets";
import type { HealthRecord } from "@/types";
import PetForm from "@/components/PetForm";
import Button from "@/components/ui/Button";

function formatAge(birthDate: string | null): string {
  if (!birthDate) return "Unknown";
  const birth = new Date(birthDate);
  const now = new Date();
  const months =
    (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (months < 12) return `${months} months`;
  return `${Math.floor(months / 12)} years`;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-4 w-1/2">
      <Text className="text-sm text-muted">{label}</Text>
      <Text className="text-fg">{value}</Text>
    </View>
  );
}

export default function Dashboard() {
  const { pets, currentPet, setCurrentPet, loading, refresh, addPetOpen, setAddPetOpen } = usePets();
  const [showForm, setShowForm] = useState<"edit" | null>(null);
  const insets = useSafeAreaInsets();

  function openAdd() {
    setShowForm(null);
    setAddPetOpen(true);
  }

  function openEdit() {
    setAddPetOpen(false);
    setShowForm("edit");
  }

  function closeForm() {
    setAddPetOpen(false);
    setShowForm(null);
  }
  const [records, setRecords] = useState<HealthRecord[]>([]);

  const load = useCallback(() => {
    if (!currentPet) {
      setRecords([]);
      return;
    }
    listRecords(currentPet.id).then(setRecords).catch(console.error);
  }, [currentPet]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function confirmDelete() {
    if (!currentPet) return;
    Alert.alert(
      `Delete ${currentPet.name}?`,
      "Their health records, photos and chat history are deleted too. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deletePet(currentPet.id);
            await refresh();
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-ink">
        <Text className="text-muted">Loading…</Text>
      </View>
    );
  }

  if (!currentPet) {
    return (
      <ScrollView
        className="flex-1 bg-ink"
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 16 }}
      >
        {addPetOpen ? (
          <PetForm onDone={() => setAddPetOpen(false)} />
        ) : (
          <>
            <Text className="mb-4 text-center text-muted">You have not added a pet yet.</Text>
            <Button label="Add pet" onPress={() => setAddPetOpen(true)} />
          </>
        )}
      </ScrollView>
    );
  }

  const todayStr = new Date().toLocaleDateString("en-CA");
  const dueRecords = records
    .filter((r) => r.next_due_date)
    .sort((a, b) => a.next_due_date!.localeCompare(b.next_due_date!));
  const overdue = dueRecords.filter((r) => r.next_due_date! < todayStr);
  const upcoming = dueRecords.filter((r) => r.next_due_date! >= todayStr);

  return (
    <ScrollView
      className="flex-1 bg-ink"
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16 }}
    >
      {pets.length > 1 ? (
        <View className="mb-6 flex-row flex-wrap gap-2">
          {pets.map((pet) => (
            <Pressable
              key={pet.id}
              onPress={() => setCurrentPet(pet)}
              className={`rounded-full px-4 py-2 ${
                pet.id === currentPet.id ? "bg-primary" : "border border-border bg-surface"
              }`}
            >
              <Text className="text-fg">{pet.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View className="flex-row items-center justify-between">
        <Text numberOfLines={1} className="flex-1 text-2xl font-bold text-fg">
          {currentPet.name}
        </Text>
        <View className="ml-4 shrink-0 flex-row gap-4">
          <Pressable onPress={openAdd}>
            <Text className="text-sm text-primary">Add</Text>
          </Pressable>
          <Pressable onPress={openEdit}>
            <Text className="text-sm text-primary">Edit</Text>
          </Pressable>
          <Pressable onPress={confirmDelete}>
            <Text className="text-sm text-danger">Delete</Text>
          </Pressable>
        </View>
      </View>

      <View className="mt-6 flex-row flex-wrap">
        <Field label="Species" value={currentPet.species} />
        <Field label="Breed" value={currentPet.breed ?? "Not set"} />
        <Field label="Age" value={formatAge(currentPet.birth_date)} />
        <Field
          label="Weight"
          value={currentPet.weight !== null ? `${currentPet.weight} kg` : "Not set"}
        />
      </View>

      <View className="mt-8 rounded-xl border border-border bg-surface p-5">
        <Text className="mb-3 text-lg font-semibold text-fg">Due</Text>
        {overdue.length === 0 && upcoming.length === 0 ? (
          <Text className="text-muted">Nothing due.</Text>
        ) : null}
        {overdue.map((r) => (
          <Text key={r.id} className="text-danger">
            Overdue: {r.title} — {r.next_due_date}
          </Text>
        ))}
        {upcoming.map((r) => (
          <Text key={r.id} className="text-fg">
            {r.title} — {r.next_due_date}
          </Text>
        ))}
      </View>
      <Modal
        visible={addPetOpen || showForm === "edit"}
        animationType="slide"
        onRequestClose={closeForm}
      >
        <ScrollView
          className="flex-1 bg-ink"
          contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16 }}
        >
          {showForm === "edit" ? (
            <PetForm key={currentPet.id} pet={currentPet} onDone={closeForm} />
          ) : (
            <PetForm key="add" onDone={closeForm} />
          )}
        </ScrollView>
      </Modal>
    </ScrollView>
  );
}