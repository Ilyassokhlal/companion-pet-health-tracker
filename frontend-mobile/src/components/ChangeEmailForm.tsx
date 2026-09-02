import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useAuth } from "@/auth/AuthContext";
import { changeEmail } from "@/api/auth";
import { errorMessage } from "@/errors";

// Stages an email change. Since v2.1 the API writes pending_email rather than swapping immediately.
// The address only changes when the link in the NEW inbox is clicked, so a typo can no longer strand the account.
export default function ChangeEmailForm() {
  const { t } = useTranslation();
  const { refreshUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    try {
      setMessage("");
      setError("");
      setSubmitting(true);
      await changeEmail(email, password);
      await refreshUser();
      setEmail("");
      setPassword("");
      setMessage(t("account.email.sent"));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className="mt-4 border-t border-border pt-4">
      <Text className="mb-2 text-sm text-muted">{t("account.email.label")}</Text>
      <Input
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text className="mt-4 mb-2 text-sm text-muted">{t("account.email.currentPassword")}</Text>
      <Input
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
      />

      {error ? <Text className="mt-2 text-sm text-danger">{error}</Text> : null}
      {message ? <Text className="mt-2 text-sm text-primary">{message}</Text> : null}
      <Button label={t("account.email.submit")} onPress={handleSubmit} loading={submitting} />
    </View>
  );
}