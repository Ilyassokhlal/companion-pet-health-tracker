import { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";

import { usePets } from "@/context/PetContext";
import { useAuth } from "@/auth/AuthContext";
import { listRecordsCached } from "@/api/records";
import type { HealthRecord } from "@/types";
import { formatDate } from "@/dates";
import { formatWeight } from "@/units";


// Weight tracking screen for the current pet.
export default function Weight() {
  const { currentPet } = usePets();
  const { user } = useAuth();
  const unitSystem = user?.unit_system ?? "metric";
  const insets = useSafeAreaInsets();
  const [records, setRecords] = useState<HealthRecord[]>([]);

  const load = useCallback(() => {
    if (!currentPet) {
      setRecords([]);
      return;
    }
    listRecordsCached(currentPet.id)
      .then(({ data }) => setRecords(data))
      .catch(console.error);
  }, [currentPet]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!currentPet) {
    return (
      <View className="flex-1 items-center justify-center bg-ink">
        <Text className="text-muted">Add a pet first.</Text>
      </View>
    );
  }

  // Oldest first, so each entry can be compared with the one before it.
  const weighed = records
    .filter((r) => r.record_type === "Weight" && r.weight_kg != null)
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <ScrollView
      className="flex-1 bg-ink"
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16 }}
    >
      <Text className="mb-6 text-2xl font-bold text-fg">Weight</Text>

      <View className="mb-6 rounded-xl border border-border bg-surface p-5">
        <Text className="text-sm text-muted">Current</Text>
        <Text className="text-3xl font-bold text-fg">
          {currentPet.weight !== null ? formatWeight(currentPet.weight, unitSystem) : "Not set"}
        </Text>
      </View>

      {weighed.length === 0 ? (
        <Text className="text-muted">No weigh-ins yet.</Text>
      ) : (
        [...weighed].reverse().map((r, index, list) => {
          // list is newest first, so the previous weigh-in is the NEXT item along.
          const previous = list[index + 1];
          const change = previous ? r.weight_kg! - previous.weight_kg! : 0;
          return (
            <View
              key={r.id}
              className="flex-row items-center justify-between border-b border-border py-3"
            >
              <Text className="text-fg">{formatDate(r.date)}</Text>
              <Text className="text-fg">
                {formatWeight(r.weight_kg!, unitSystem)}
                {previous && change !== 0 ? (
                  <Text className="text-sm text-muted">
                    {"  "}
                    {change > 0 ? "↑" : "↓"} {formatWeight(Math.abs(change), unitSystem)}
                  </Text>
                ) : null}
              </Text>
            </View>
          );
        })
      )}
    </ScrollView>
  );
}