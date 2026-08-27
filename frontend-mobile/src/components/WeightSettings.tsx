import { useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";

import { useAuth } from "@/auth/AuthContext";
import { usePets } from "@/context/PetContext";
import { updateMe } from "@/api/auth";
import { updatePet } from "@/api/pets";
import { WEIGHT_FREQUENCIES } from "@/types";
import type { WeightFrequency } from "@/types";

const FREQUENCY_LABELS: Record<WeightFrequency, string> = {
  weekly: "Every week",
  biweekly: "Every two weeks",
  monthly: "Every month",
};

export default function WeightSettings() {
  const { user, refreshUser } = useAuth();
  const { pets, refresh } = usePets();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Every control re-reads the user and the pet list afterwards.
  // The backend creates or deletes pending check-ins as a side effect of these switches.
  // This function wraps the API calls to ensure the UI stays in sync with the backend.
  async function save(action: () => Promise<unknown>) {
    try {
      setSaving(true);
      setError("");
      await action();
      await refreshUser();
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <View className="mb-6 rounded-xl border border-border bg-surface p-5">
      <Text className="mb-4 text-lg font-semibold text-fg">Weight tracking</Text>
      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

      <View className="mb-4 flex-row items-center justify-between gap-3">
        <Text className="shrink text-fg">{"Track my pets' weight"}</Text>
        <Switch
          value={user.weight_tracking_enabled}
          disabled={saving}
          onValueChange={(v) => save(() => updateMe({ weight_tracking_enabled: v }))}
        />
      </View>

      {!user.weight_tracking_enabled ? (
        <Text className="text-sm text-muted">
          Turn this on to schedule weigh-ins for individual pets.
        </Text>
      ) : null}

      {user.weight_tracking_enabled && pets.length === 0 ? (
        <Text className="text-sm text-muted">Add a pet to start tracking.</Text>
      ) : null}

      {user.weight_tracking_enabled
        ? pets.map((pet) => (
            <View key={pet.id} className="border-t border-border py-3">
              <View className="flex-row items-center justify-between gap-3">
                <Text className="shrink text-fg">{pet.name}</Text>
                <Switch
                  value={pet.weight_tracking_enabled}
                  disabled={saving}
                  onValueChange={(v) => save(() => updatePet(pet.id, { weight_tracking_enabled: v }))}
                />
              </View>
              {pet.weight_tracking_enabled ? (
                <View className="mt-2 flex-row flex-wrap gap-2">
                  {WEIGHT_FREQUENCIES.map((f) => (
                    <Pressable
                      key={f}
                      onPress={() => save(() => updatePet(pet.id, { weight_frequency: f }))}
                      disabled={saving}
                      className={`rounded-full px-3 py-1.5 ${
                        pet.weight_frequency === f ? "bg-primary" : "border border-border bg-ink"
                      }`}
                    >
                      <Text
                        className={`text-sm ${
                          pet.weight_frequency === f ? "text-on-primary" : "text-fg"
                        }`}
                      >
                        {FREQUENCY_LABELS[f]}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          ))
        : null}
    </View>
  );
}