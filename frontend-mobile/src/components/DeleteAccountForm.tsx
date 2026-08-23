import { useState } from "react";
import { Alert, Text, View } from "react-native";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useAuth } from "@/auth/AuthContext";
import { deleteAccount } from "@/api/auth";

// Permanent. The API requires the current password, because a hijacked session could otherwise wipe the account outright.
export default function DeleteAccountForm() {
  const { logout } = useAuth();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function confirm() {
    Alert.alert("Delete account", "This permanently removes your pets, records and photos.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: run },
    ]);
  }

  async function run() {
    setError("");
    setSubmitting(true);
    try {
      await deleteAccount(password);
      await logout();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className="mb-6 rounded-xl border border-danger bg-surface p-5">
      <Text className="mb-2 text-lg font-semibold text-danger">Delete account</Text>
      <Text className="mb-4 text-sm text-muted">This action is permanent and cannot be undone.</Text>
      <Text className="mb-2 text-sm text-muted">Current password</Text>
      <Input
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
      />
      {error ? <Text className="mb-4 text-sm text-danger">{error}</Text> : null}
      <Button label="Delete account" variant="danger" onPress={confirm} loading={submitting} />
    </View>
  );
}