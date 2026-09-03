import { useState } from "react";
import { useTranslation } from "react-i18next";
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
import { errorMessage } from "@/errors";
import TagInput from "@/components/TagInput";

interface Props {
  pet?: Pet;
  onDone: () => void;
}

// These are the values the API stores. Their labels live in en.json under petForm.speciesOptions.
const SPECIES = ["Dog", "Cat"];


export default function PetForm({ pet, onDone }: Props) {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const unitSystem = user?.unit_system ?? "metric";
  const unit = weightUnit(unitSystem);
  const [name, setName] = useState(pet?.name ?? "");
  const [species, setSpecies] = useState(pet?.species ?? "Dog");
  const [breed, setBreed] = useState(pet?.breed ?? "");
  const [birthDate, setBirthDate] = useState(pet?.birth_date ?? "");
  const [sex, setSex] = useState<"male" | "female" | "">(pet?.sex ?? "");
  const [neutered, setNeutered] = useState(pet?.neutered ?? false);
  const [weight, setWeight] = useState(pet?.weight != null ? String(fromKg(pet.weight, unitSystem)) : "");
  const [trackWeight, setTrackWeight] = useState(pet?.weight_tracking_enabled ?? false);
  const [frequency, setFrequency] = useState<WeightFrequency>(pet?.weight_frequency ?? "monthly");
  const [dietary, setDietary] = useState<string[]>(pet?.dietary_restrictions ?? []);
  const [hasDietary, setHasDietary] = useState((pet?.dietary_restrictions?.length ?? 0) > 0);
  const [disabilities, setDisabilities] = useState<string[]>(pet?.disabilities ?? []);
  const [hasDisabilities, setHasDisabilities] = useState((pet?.disabilities?.length ?? 0) > 0);
  const [monthlyBudget, setMonthlyBudget] = useState(pet?.monthly_budget != null ? String(pet.monthly_budget) : "");
  const currency = user?.currency ?? "USD";
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
      sex: sex === "" ? null : sex,
      neutered,
      weight: weight ? toKg(parseFloat(weight), unitSystem) : null,
      weight_tracking_enabled: trackWeight,
      walk_tracking_enabled: pet?.walk_tracking_enabled ?? false,
      monthly_budget: monthlyBudget === "" ? null : Number(monthlyBudget),
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
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className="mt-6 gap-4 rounded-xl border border-border bg-surface p-5">
      <View>
        <Text className="mb-1 text-sm text-muted">{t("petForm.name")}</Text>
        <Input value={name} onChangeText={setName} placeholder={t("petForm.name")} />
      </View>

      <View>
        <Text className="mb-1 text-sm text-muted">{t("petForm.species")}</Text>
        <View className="flex-row gap-2">
          {SPECIES.map((s) => (
            <Pressable
              key={s}
              onPress={() => setSpecies(s)}
              className={`rounded-lg px-4 py-2 ${
                species === s ? "bg-primary" : "border border-border bg-ink"
              }`}
            >
              <Text className="text-fg">{t(`petForm.speciesOptions.${s}`)}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View>
        <Text className="mb-1 text-sm text-muted">{t("petForm.breed")}</Text>
        <Input value={breed} onChangeText={setBreed} placeholder={t("common.optional")} />
      </View>

      <DateField
        label={t("petForm.birthDate")}
        value={birthDate}
        onChange={setBirthDate}
        maximumDate={new Date()}
        clearable
      />

      <View>
        <Text className="mb-1 text-sm text-muted">{t("petForm.sex")}</Text>
        <View className="mb-4 flex-row flex-wrap gap-2">
          {([["", "sexUnset"], ["male", "male"], ["female", "female"]] as const).map(([value, key]) => (
            <Pressable
              key={key}
              onPress={() => setSex(value)}
              className={`rounded-lg border px-3 py-1.5 active:opacity-70 ${
                sex === value ? "border-primary bg-primary" : "border-border bg-ink"
              }`}
            >
              <Text className={`text-sm ${sex === value ? "text-on-primary" : "text-muted"}`}>
                {t(`petForm.${key}`)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* The word is gendered, so the label follows the sex above and falls back to the neutral
            form while sex is unset. */}
        <Pressable
          onPress={() => setNeutered(!neutered)}
          className="mb-4 flex-row items-center gap-3 active:opacity-70"
        >
          <View
            className={`h-5 w-5 items-center justify-center rounded border ${
              neutered ? "border-primary bg-primary" : "border-border bg-ink"
            }`}
          >
            {neutered ? <Text className="text-xs font-bold text-on-primary">✓</Text> : null}
          </View>
          <Text className="text-fg">
            {sex === "male"
              ? t("petForm.neutered")
              : sex === "female"
                ? t("petForm.spayed")
                : t("petForm.neuteredOrSpayed")}
          </Text>
        </Pressable>

        <Text className="mb-1 text-sm text-muted">{t("common.weight", { unit })}</Text>
        <Input
          value={weight}
          onChangeText={setWeight}
          placeholder={t("common.optional")}
          keyboardType="decimal-pad"
        />
      </View>

      <View>
        <Text className="mb-1 text-sm text-muted">{t("petForm.budget", { currency })}</Text>
        <Input
          value={monthlyBudget}
          onChangeText={setMonthlyBudget}
          placeholder={t("petForm.noLimit")}
          keyboardType="decimal-pad"
        />
      </View>

      <View className="flex-row items-center justify-between gap-3">
        <Text className="shrink text-fg">{t("petForm.trackWeight")}</Text>
        <Switch value={trackWeight} onValueChange={setTrackWeight} />
      </View>

      {trackWeight ? (
        <View>
          <Text className="mb-1 text-sm text-muted">{t("petForm.checkIn")}</Text>
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
                  {t(`trackingSettings.weight.${f}`)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      <View className="flex-row items-center justify-between gap-3">
        <Text className="shrink text-fg">{t("petForm.hasDietary")}</Text>
        <Switch
          value={hasDietary}
          onValueChange={(v) => { setHasDietary(v); if (!v) setDietary([]); }}
        />
      </View>

      {hasDietary ? (
        <TagInput
          label={t("petForm.dietary")}
          values={dietary}
          onChange={setDietary}
          placeholder={t("petForm.dietaryPlaceholder")}
        />
      ) : null}

      <View className="flex-row items-center justify-between gap-3">
        <Text className="shrink text-fg">{t("petForm.hasDisabilities")}</Text>
        <Switch
          value={hasDisabilities}
          onValueChange={(v) => { setHasDisabilities(v); if (!v) setDisabilities([]); }}
        />
      </View>

      {hasDisabilities ? (
        <TagInput
          label={t("petForm.disabilities")}
          values={disabilities}
          onChange={setDisabilities}
          placeholder={t("petForm.disabilitiesPlaceholder")}
        />
      ) : null}

      {error ? <Text className="text-sm text-danger">{error}</Text> : null}

      <Button label={pet ? t("common.save") : t("petForm.add")} onPress={handleSubmit} loading={submitting} />
      <Button label={t("common.cancel")} variant="secondary" onPress={onDone} />
    </View>
  );
}