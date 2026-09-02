import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Switch, Text, View } from "react-native";

import { useAuth } from "@/auth/AuthContext";
import { updateMe } from "@/api/auth";
import { errorMessage } from "@/errors";

export default function FeedingSettings() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(action: () => Promise<unknown>) {
    setSaving(true);
    setError(null);
    try {
      await action();
      await refreshUser();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (!user) return null;

  return (
    <View className="mb-6 rounded-xl border border-border bg-surface p-5">
      <Text className="mb-4 text-lg font-semibold text-fg">{t("trackingSettings.feeding.title")}</Text>
      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}
      <Text className="mb-4 text-sm text-muted">
        {t("trackingSettings.feeding.note")}
      </Text>

      <View className="mb-4 flex-row items-center justify-between gap-3">
        <Text className="shrink text-fg">{t("trackingSettings.feeding.push")}</Text>
        <Switch
          value={user.feeding_push_enabled ?? false}
          disabled={saving}
          onValueChange={(v) => save(() => updateMe({ feeding_push_enabled: v }))}
        />
      </View>

      <View className="flex-row items-center justify-between gap-3">
        <Text className="shrink text-fg">{t("trackingSettings.feeding.email")}</Text>
        <Switch
          value={user.feeding_email_enabled ?? false}
          disabled={saving}
          onValueChange={(v) => save(() => updateMe({ feeding_email_enabled: v }))}
        />
      </View>
    </View>
  );
}