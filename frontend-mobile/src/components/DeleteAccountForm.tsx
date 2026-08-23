import { useState } from "react";
import { Alert, Text, View } from "react-native";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useAuth } from "@/auth/AuthContext";
import { deleteAccount } from "@/api/auth";

// Permanent. The API requires the current password, because a hijacked session could otherwise wipe the account outright.
// Collapsed by default — a password field and a red button sitting open on the settings screen is inconsistent with the
// rest of the settings UI.
export default function DeleteAccountForm() {
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
    <View className={`mb-6 rounded-xl border bg-surface p-5 ${open ? "border-danger" : "border-border"}`}>
      <Text className={`mb-2 text-lg font-semibold ${open ? "text-danger" : "text-fg"}`}>
        Delete account
      </Text>
      <Text className="mb-4 text-sm text-muted">This action is permanent and cannot be undone.</Text>

      {open ? (
        <>
          <Text className="mb-2 text-sm text-muted">Current password</Text>
          <Input value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
          {error ? <Text className="mt-2 text-sm text-danger">{error}</Text> : null}
          <View className="mt-4 gap-2">
            <Button label="Delete account" variant="danger" onPress={confirm} loading={submitting} />
            <Button label="Cancel" variant="secondary" onPress={close} />
          </View>
        </>
      ) : (
        <Button label="Delete account" variant="secondary" onPress={() => setOpen(true)} />
      )}
    </View>
  );
}