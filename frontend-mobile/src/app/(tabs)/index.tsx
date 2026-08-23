import { useCallback, useState } from "react";
import { Alert, KeyboardAvoidingView, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";

import { usePets } from "@/context/PetContext";
import { listRecords } from "@/api/records";
import { deletePet } from "@/api/pets";
import type { HealthRecord } from "@/types";
import PetForm from "@/components/PetForm";
import Button from "@/components/ui/Button";
import { formatDate } from "@/dates";

// Formats a pet's age: days under one month, months under one year, then years.
function formatAge(birthDate: string | null): string {
  if (!birthDate) return "Unknown";
  const birth = new Date(`${birthDate}T00:00:00`);
  const now = new Date();
  let months =
    (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
  if (now.getDate() < birth.getDate()) months--;
  if (months < 1) {
    const days = Math.floor((now.getTime() - birth.getTime()) / 86400000);
    return days === 1 ? "1 day" : `${days} days`;
  }
  if (months < 12) return months === 1 ? "1 month" : `${months} months`;
  const years = Math.floor(months / 12);
  return years === 1 ? "1 year" : `${years} years`;
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
        <View className="ml-3 shrink-0 flex-row gap-2">
          <Pressable
            onPress={openAdd}
            className="rounded-full border border-border bg-surface px-3 py-1.5 active:opacity-70"
          >
            <Text className="text-sm font-medium text-primary">Add</Text>
          </Pressable>
          <Pressable
            onPress={openEdit}
            className="rounded-full bg-primary px-3 py-1.5 active:opacity-70"
          >
            <Text className="text-sm font-medium text-white">Edit</Text>
          </Pressable>
          <Pressable
            onPress={confirmDelete}
            className="rounded-full bg-danger px-3 py-1.5 active:opacity-70"
          >
            <Text className="text-sm font-medium text-white">Delete</Text>
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
            Overdue: {r.title} — {formatDate(r.next_due_date!)}
          </Text>
        ))}
        {upcoming.map((r) => (
          <Text key={r.id} className="text-fg">
            {r.title} — {formatDate(r.next_due_date!)}
          </Text>
        ))}
      </View>
      <Modal
        visible={addPetOpen || showForm === "edit"}
        animationType="slide"
        onRequestClose={closeForm}
      >
        <KeyboardAvoidingView behavior="padding" className="flex-1">
          <ScrollView
            className="flex-1 bg-ink"
            contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 16, paddingTop: insets.top + 16 }}
            keyboardShouldPersistTaps="handled"
          >
            {showForm === "edit" ? (
              <PetForm key={currentPet.id} pet={currentPet} onDone={closeForm} />
            ) : (
              <PetForm key="add" onDone={closeForm} />
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </ScrollView>
  );
}