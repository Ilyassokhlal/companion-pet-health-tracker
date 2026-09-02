import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useAuth } from "@/auth/AuthContext";
import UserPhoto from "@/components/UserPhoto";
import ChangeUsernameForm from "@/components/ChangeUsernameForm";
import ChangeEmailForm from "@/components/ChangeEmailForm";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import DeleteAccountForm from "@/components/DeleteAccountForm";
import { dateLocale } from "@/dates";

type Panel = "username" | "email" | "password";

// One row of the account card: a label, its current value, and the button that opens its panel.
function Row({
  label,
  value,
  panel,
  editing,
  onToggle,
}: {
  label: string;
  value: string;
  panel: Panel;
  editing: Panel | null;
  onToggle: (panel: Panel) => void;
}) {
  const { t } = useTranslation();
  const open = editing === panel;
  return (
    <View className="mb-4 flex-row items-center justify-between gap-3">
      <View className="min-w-0 flex-1">
        <Text className="text-sm text-muted">{label}</Text>
        <Text numberOfLines={1} className="text-fg">
          {value}
        </Text>
      </View>
      <Pressable
        onPress={() => onToggle(panel)}
        className={`shrink-0 rounded-full px-3 py-1.5 active:opacity-70 ${
          open ? "border border-border bg-surface" : "bg-primary"
        }`}
      >
        <Text className={`text-sm font-medium ${open ? "text-primary" : "text-white"}`}>
          {open ? t("common.cancel") : t("settingsPage.update")}
        </Text>
      </Pressable>
    </View>
  );
}

export default function Account() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [editing, setEditing] = useState<Panel | null>(null);

  if (!user) return null;

  const toggle = (panel: Panel) => setEditing(editing === panel ? null : panel);

  return (
    <ScrollView
      className="flex-1 bg-ink"
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16 }}
      keyboardShouldPersistTaps="handled"
    >
      <Text className="mb-6 text-2xl font-bold text-fg">{t("settingsPage.groups.account.label")}</Text>

      <View className="mb-6 rounded-xl border border-border bg-surface p-5">
        <View className="mb-6">
          <UserPhoto />
        </View>

        <Row label={t("common.username")} value={user.username} panel="username" editing={editing} onToggle={toggle} />
        <Row label={t("common.email")} value={user.email} panel="email" editing={editing} onToggle={toggle} />
        <Row label={t("common.password")} value="••••••••" panel="password" editing={editing} onToggle={toggle} />

        <View className="flex-row items-center justify-between">
          <Text className="text-sm text-muted">{t("settingsPage.memberSince")}</Text>
          <Text className="text-fg">{new Date(user.created_at).toLocaleDateString(dateLocale())}</Text>
        </View>

        {user.email_verified ? null : (
          <Text className="mt-4 text-sm text-danger">{t("settingsPage.notVerified")}</Text>
        )}
        {editing === "username" ? <ChangeUsernameForm onDone={() => setEditing(null)} /> : null}
        {editing === "email" ? <ChangeEmailForm /> : null}
        {editing === "password" ? <ChangePasswordForm onDone={() => setEditing(null)} /> : null}
      <DeleteAccountForm />
      </View>
    </ScrollView>
  );
}