import { useState } from "react";
import { Text, View } from "react-native";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useAuth } from "@/auth/AuthContext";
import { updateMe } from "@/api/auth";

// Changes the signed-in user's display name. No password confirmation and no re-verification.
// The username is not an identifier here, login is by email.
export default function ChangeUsernameForm({ onDone }: { onDone: () => void }) {
  const { user, refreshUser } = useAuth();
  const [username, setUsername] = useState(user?.username ?? "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    try {
      setError("");
      setSubmitting(true);
      const trimmed = username.trim();
      if (!trimmed || trimmed === user?.username) return;
      await updateMe({ username: trimmed });
      await refreshUser();
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className="mt-4 border-t border-border pt-4">
      <Text className="mb-2 text-sm text-muted">Username</Text>
      <Input value={username} onChangeText={setUsername} maxLength={36} autoCapitalize="none" />
      {error ? <Text className="mt-2 text-sm text-danger">{error}</Text> : null}
      <Button label="Change Username" onPress={handleSubmit} loading={submitting} />
    </View>
  );
}