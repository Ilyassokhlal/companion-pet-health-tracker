import { useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import DateField from "@/components/ui/DateField";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { usePets } from "@/context/PetContext";
import { useAuth } from "@/auth/AuthContext";
import { createPet, updatePet } from "@/api/pets";
import { WEIGHT_FREQUENCIES } from "@/types";
import type { Pet, WeightFrequency } from "@/types";
import { fromKg, toKg, weightUnit } from "@/units";
import TagInput from "@/components/TagInput";

interface Props {
  pet?: Pet;
  onDone: () => void;
}

const SPECIES = ["Dog", "Cat"];

const FREQUENCY_LABELS: Record<WeightFrequency, string> = {
  weekly: "Every week",
  biweekly: "Every two weeks",
  monthly: "Every month",
};


export default function PetForm({ pet, onDone }: Props) {
  const { user, refreshUser } = useAuth();
  const unitSystem = user?.unit_system ?? "metric";
  const unit = weightUnit(unitSystem);
  const [name, setName] = useState(pet?.name ?? "");
  const [species, setSpecies] = useState(pet?.species ?? "Dog");
  const [breed, setBreed] = useState(pet?.breed ?? "");
  const [birthDate, setBirthDate] = useState(pet?.birth_date ?? "");
  const [weight, setWeight] = useState(pet?.weight != null ? String(fromKg(pet.weight, unitSystem)) : "");
  const [trackWeight, setTrackWeight] = useState(pet?.weight_tracking_enabled ?? false);
  const [frequency, setFrequency] = useState<WeightFrequency>(pet?.weight_frequency ?? "monthly");
  const [dietary, setDietary] = useState<string[]>(pet?.dietary_restrictions ?? []);
  const [hasDietary, setHasDietary] = useState((pet?.dietary_restrictions?.length ?? 0) > 0);
  const [disabilities, setDisabilities] = useState<string[]>(pet?.disabilities ?? []);
  const [hasDisabilities, setHasDisabilities] = useState((pet?.disabilities?.length ?? 0) > 0);
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
      weight: weight ? toKg(parseFloat(weight), unitSystem) : null,
      weight_tracking_enabled: trackWeight,
      walk_tracking_enabled: pet?.walk_tracking_enabled ?? false,
      monthly_budget: pet?.monthly_budget ?? null,
      weight_frequency: frequency,
      dietary_restrictions: dietary,
      disabilities: disabilities,
    };
    try {
      if (pet) {
        await updatePet(pet.id, payload);
      } else {
        await createPet(payload);
      }
      await refresh();
      if (trackWeight && !user?.weight_tracking_enabled) await refreshUser();
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
        <Text className="mb-1 text-sm text-muted">Weight ({unit})</Text>
        <Input
          value={weight}
          onChangeText={setWeight}
          placeholder="Optional"
          keyboardType="decimal-pad"
        />
      </View>

      <View className="flex-row items-center justify-between gap-3">
        <Text className="shrink text-fg">{"Track this pet's weight"}</Text>
        <Switch value={trackWeight} onValueChange={setTrackWeight} />
      </View>

      {trackWeight ? (
        <View>
          <Text className="mb-1 text-sm text-muted">Check in</Text>
          <View className="flex-row flex-wrap gap-2">
            {WEIGHT_FREQUENCIES.map((f) => (
              <Pressable
                key={f}
                onPress={() => setFrequency(f)}
                className={`rounded-lg px-3 py-2 ${
                  frequency === f ? "bg-primary" : "border border-border bg-ink"
                }`}
              >
                <Text className={`text-sm ${frequency === f ? "text-on-primary" : "text-fg"}`}>
                  {FREQUENCY_LABELS[f]}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <View className="flex-row items-center justify-between gap-3">
        <Text className="shrink text-fg">Has dietary restrictions or allergies</Text>
        <Switch
          value={hasDietary}
          onValueChange={(v) => { setHasDietary(v); if (!v) setDietary([]); }}
        />
      </View>

      {hasDietary ? (
        <TagInput
          label="Dietary restrictions & allergies"
          values={dietary}
          onChange={setDietary}
          placeholder="e.g. Chicken"
        />
      ) : null}

      <View className="flex-row items-center justify-between gap-3">
        <Text className="shrink text-fg">Has disabilities</Text>
        <Switch
          value={hasDisabilities}
          onValueChange={(v) => { setHasDisabilities(v); if (!v) setDisabilities([]); }}
        />
      </View>

      {hasDisabilities ? (
        <TagInput
          label="Disabilities"
          values={disabilities}
          onChange={setDisabilities}
          placeholder="e.g. Deaf in left ear"
        />
      ) : null}

      {error ? <Text className="text-sm text-danger">{error}</Text> : null}

      <Button label={pet ? "Save" : "Add pet"} onPress={handleSubmit} loading={submitting} />
      <Button label="Cancel" variant="secondary" onPress={onDone} />
    </View>
  );
}