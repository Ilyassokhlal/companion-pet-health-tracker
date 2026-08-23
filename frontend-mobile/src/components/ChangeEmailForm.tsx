import { useState } from "react";
import { Text, View } from "react-native";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useAuth } from "@/auth/AuthContext";
import { changeEmail } from "@/api/auth";

// Stages an email change. Since v2.1 the API writes pending_email rather than swapping immediately.
// The address only changes when the link in the NEW inbox is clicked, so a typo can no longer strand the account.
export default function ChangeEmailForm() {
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
      setMessage("Check your NEW inbox to confirm the email change.");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className="mt-4 border-t border-border pt-4">
      <Text className="mb-2 text-sm text-muted">New Email</Text>
      <Input
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <Text className="mt-4 mb-2 text-sm text-muted">Current Password</Text>
      <Input
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
      />

      {error ? <Text className="mt-2 text-sm text-danger">{error}</Text> : null}
      {message ? <Text className="mt-2 text-sm text-primary">{message}</Text> : null}
      <Button label="Change Email" onPress={handleSubmit} loading={submitting} />
    </View>
  );
}