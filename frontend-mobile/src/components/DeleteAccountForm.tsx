import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { useDialog } from "@/components/ui/DialogProvider";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useAuth } from "@/auth/AuthContext";
import { deleteAccount } from "@/api/auth";
import { errorMessage } from "@/errors";

// Permanent. The API requires the current password, because a hijacked session could otherwise wipe the account outright.
// Collapsed by default — a password field and a red button sitting open on the settings screen is inconsistent with the
// rest of the settings UI.
export default function DeleteAccountForm() {
  const { t } = useTranslation();
  const { confirm: ask } = useDialog();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function close() {
    setOpen(false);
    setPassword("");
    setError("");
  }

  async function confirm() {
    const ok = await ask({
      title: t("account.delete.title"),
      message: t("account.delete.confirmBody"),
      confirmLabel: t("common.delete"),
      destructive: true,
    });
    if (ok) run();
  }

  async function run() {
    setError("");
    setSubmitting(true);
    try {
      await deleteAccount(password);
      await logout();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className={`mb-6 rounded-xl border bg-surface p-5 ${open ? "border-danger" : "border-border"}`}>
      <Text className={`mb-2 text-lg font-semibold ${open ? "text-danger" : "text-fg"}`}>
        {t("account.delete.title")}
      </Text>
      <Text className="mb-4 text-sm text-muted">{t("account.delete.warning")}</Text>

      {open ? (
        <>
          <Text className="mb-2 text-sm text-muted">{t("account.delete.currentPassword")}</Text>
          <Input value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
          {error ? <Text className="mt-2 text-sm text-danger">{error}</Text> : null}
          <View className="mt-4 gap-2">
            <Button label={t("account.delete.title")} variant="danger" onPress={confirm} loading={submitting} />
            <Button label={t("common.cancel")} variant="secondary" onPress={close} />
          </View>
        </>
      ) : (
        <Button label={t("account.delete.title")} variant="secondary" onPress={() => setOpen(true)} />
      )}
    </View>
  );
}