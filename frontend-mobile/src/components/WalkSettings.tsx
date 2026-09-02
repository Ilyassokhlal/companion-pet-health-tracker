import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Switch, Text, View } from "react-native";

import { useAuth } from "@/auth/AuthContext";
import { usePets } from "@/context/PetContext";
import { updateMe } from "@/api/auth";
import { updatePet } from "@/api/pets";
import { errorMessage } from "@/errors";

export default function WalkSettings() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const { pets, refresh } = usePets();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(action: () => Promise<unknown>) {
    setSaving(true);
    setError(null);
    try {
      await action();
      await refreshUser();
      await refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <View className="mb-6 rounded-xl border border-border bg-surface p-5">
      <Text className="mb-4 text-lg font-semibold text-fg">{t("trackingSettings.walks.title")}</Text>
      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}

      <View className="mb-4 flex-row items-center justify-between gap-3">
        <Text className="shrink text-fg">{t("trackingSettings.walks.account")}</Text>
        <Switch
          value={user.walk_tracking_enabled ?? false}
          disabled={saving}
          onValueChange={(v) => save(() => updateMe({ walk_tracking_enabled: v }))}
        />
      </View>

      {!user.walk_tracking_enabled ? (
        <Text className="text-sm text-muted">
          {t("trackingSettings.walks.off")}
        </Text>
      ) : null}

      {user.walk_tracking_enabled && pets.length === 0 ? (
        <Text className="text-sm text-muted">{t("trackingSettings.walks.noPets")}</Text>
      ) : null}

      {user.walk_tracking_enabled
        ? pets.map((pet) => (
            <View key={pet.id} className="border-t border-border py-3">
              <View className="flex-row items-center justify-between gap-3">
                <Text className="shrink text-fg">{pet.name}</Text>
                <Switch
                  value={pet.walk_tracking_enabled ?? false}
                  disabled={saving}
                  onValueChange={(v) => save(() => updatePet(pet.id, { walk_tracking_enabled: v }))}
                />
              </View>
            </View>
          ))
        : null}
    </View>
  );
}