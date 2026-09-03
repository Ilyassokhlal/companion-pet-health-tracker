import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, Modal, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";

import { usePets } from "@/context/PetContext";
import { useAuth } from "@/auth/AuthContext";
import { listRecordsCached, createRecord } from "@/api/records";
import type { HealthRecord } from "@/types";
import { formatDate } from "@/dates";
import { formatWeight, weightUnit, toKg } from "@/units";
import { errorMessage } from "@/errors";
import DateField from "@/components/ui/DateField";
import Button from "@/components/ui/Button";


// Weight tracking screen for the current pet.
export default function Weight() {
  const { t } = useTranslation();
  const { currentPet, refresh } = usePets();
  const { user } = useAuth();
  const unitSystem = user?.unit_system ?? "metric";
  const insets = useSafeAreaInsets();
  const [records, setRecords] = useState<HealthRecord[]>([]);

  const [formOpen, setFormOpen] = useState(false);
  const [date, setDate] = useState("");
  const [weight, setWeight] = useState("");
  const [saving, setSaving] = useState(false);

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

  function openCreate() {
    setDate(new Date().toLocaleDateString("en-CA"));
    setWeight("");
    setFormOpen(true);
  }

  // A weigh-in is an ordinary health record of type Weight, so it flows through the same endpoint
  // and the server's sync_pet_weight keeps the pet's current weight and its check-in in step. The
  // title is filled in rather than asked for — there is nothing else a weigh-in could be called.
  async function save() {
    if (!currentPet || weight.trim() === "") return;
    setSaving(true);
    try {
      await createRecord(currentPet.id, {
        record_type: "Weight",
        title: t("tracking.weight"),
        description: null,
        date,
        next_due_date: null,
        weight_kg: toKg(Number(weight), unitSystem),
      });
      setFormOpen(false);
      await refresh();
      load();
    } catch (err) {
      Alert.alert(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (!currentPet) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-muted">{t("common.noPet")}</Text>
      </View>
    );
  }

  // Oldest first, so each entry can be compared with the one before it.
  const weighed = records
    .filter((r) => r.record_type === "Weight" && r.weight_kg != null)
    .sort((a, b) => a.date.localeCompare(b.date));

  return (
    <View className="flex-1">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16 }}
      >
        <Text className="mb-1 text-2xl font-bold text-fg">{t("tracking.weight")}</Text>
        <Text className="mb-6 text-sm text-muted">{currentPet.name}</Text>

        <View className="mb-6 items-center rounded-xl border border-border bg-surface p-5">
          <Text className="text-sm text-muted">{t("weightTracking.current")}</Text>
          <Text className="text-3xl font-bold text-fg">
            {currentPet.weight !== null ? formatWeight(currentPet.weight, unitSystem) : t("common.notSet")}
          </Text>
        </View>

        <View className="mb-6">
          <Button label={t("weightTracking.add")} onPress={openCreate} />
        </View>

        {weighed.length === 0 ? (
          <Text className="text-muted">{t("weightTracking.empty")}</Text>
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

      <Modal visible={formOpen} animationType="slide" transparent onRequestClose={() => setFormOpen(false)}>
        <View className="flex-1 justify-end bg-black/70">
          <View className="max-h-[88%] rounded-t-2xl border-t border-border bg-ink p-5">
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text className="mb-4 text-lg font-semibold text-fg">{t("weightTracking.add")}</Text>

              <View className="mb-3">
                <DateField label={t("common.date")} value={date} onChange={setDate} maximumDate={new Date()} />
              </View>

              <Text className="mb-1 text-sm text-muted">
                {t("common.weight", { unit: weightUnit(unitSystem) })}
              </Text>
              <TextInput
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                className="mb-4 rounded-lg border border-border bg-surface px-4 py-3 text-fg"
              />

              <View className="gap-2">
                <Button label={t("common.save")} onPress={save} loading={saving} />
                <Button label={t("common.cancel")} variant="secondary" onPress={() => setFormOpen(false)} />
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}