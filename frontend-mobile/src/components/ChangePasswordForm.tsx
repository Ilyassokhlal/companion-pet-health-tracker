import { useState } from "react";
import { Text, View } from "react-native";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { changePassword } from "@/api/auth";

// Changing the password invalidates every existing token via the fp claim. The API returns a fresh one and api/auth.ts
// stores it, so THIS session survives and any other signed-in device is logged out on its next request.
export default function ChangePasswordForm({ onDone }: { onDone: () => void }) {
  const [current, setCurrent] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    try {
      setError("");
      setSubmitting(true);
      if (newPassword !== confirm) {
        setError("Passwords don't match.");
        return;
      }
      await changePassword(current, newPassword);
      setCurrent("");
      setNewPassword("");
      setConfirm("");
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className="mt-4 border-t border-border pt-4">
      <Text className="mb-2 text-sm text-muted">Current Password</Text>
      <Input
        value={current}
        onChangeText={setCurrent}
        secureTextEntry
        autoCapitalize="none"
      />

      <Text className="mt-4 mb-2 text-sm text-muted">New Password</Text>
      <Input
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
      />

      <Text className="mt-4 mb-2 text-sm text-muted">Confirm New Password</Text>
      <Input
        value={confirm}
        onChangeText={setConfirm}
        secureTextEntry
        autoCapitalize="none"
        autoComplete="new-password"
        textContentType="newPassword"
      />

      {error ? <Text className="mt-2 text-sm text-danger">{error}</Text> : null}
      <Button label="Change Password" onPress={handleSubmit} loading={submitting} />
    </View>
  );
}