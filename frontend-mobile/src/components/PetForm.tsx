import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import DateField from "@/components/ui/DateField";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { usePets } from "@/context/PetContext";
import { createPet, updatePet } from "@/api/pets";
import type { Pet } from "@/types";

interface Props {
  pet?: Pet;
  onDone: () => void;
}

const SPECIES = ["Dog", "Cat"];

export default function PetForm({ pet, onDone }: Props) {
  const [name, setName] = useState(pet?.name ?? "");
  const [species, setSpecies] = useState(pet?.species ?? "Dog");
  const [breed, setBreed] = useState(pet?.breed ?? "");
  const [birthDate, setBirthDate] = useState(pet?.birth_date ?? "");
  const [weight, setWeight] = useState(pet?.weight?.toString() ?? "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { refresh } = usePets();

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    const payload = {
      name,
      species,
      breed: breed || null,
      birth_date: birthDate || null,
      weight: weight ? parseFloat(weight) : null,
    };
    try {
      if (pet) {
        await updatePet(pet.id, payload);
      } else {
        await createPet(payload);
      }
      await refresh();
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className="mt-6 gap-4 rounded-xl border border-border bg-surface p-5">
      <View>
        <Text className="mb-1 text-sm text-muted">Name</Text>
        <Input value={name} onChangeText={setName} placeholder="Name" />
      </View>

      <View>
        <Text className="mb-1 text-sm text-muted">Species</Text>
        <View className="flex-row gap-2">
          {SPECIES.map((s) => (
            <Pressable
              key={s}
              onPress={() => setSpecies(s)}
              className={`rounded-lg px-4 py-2 ${
                species === s ? "bg-primary" : "border border-border bg-ink"
              }`}
            >
              <Text className="text-fg">{s}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View>
        <Text className="mb-1 text-sm text-muted">Breed</Text>
        <Input value={breed} onChangeText={setBreed} placeholder="Optional" />
      </View>

      <DateField
        label="Birth date"
        value={birthDate}
        onChange={setBirthDate}
        maximumDate={new Date()}
        clearable
      />

      <View>
        <Text className="mb-1 text-sm text-muted">Weight (kg)</Text>
        <Input
          value={weight}
          onChangeText={setWeight}
          placeholder="Optional"
          keyboardType="decimal-pad"
        />
      </View>

      {error ? <Text className="text-sm text-danger">{error}</Text> : null}

      <Button label={pet ? "Save" : "Add pet"} onPress={handleSubmit} loading={submitting} />
      <Button label="Cancel" variant="secondary" onPress={onDone} />
    </View>
  );
}