import { useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, ScrollView, Text, View } from "react-native";
import { Link, router, useLocalSearchParams } from "expo-router";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { resetPassword } from "@/api/auth";
import { useAuth } from "@/auth/AuthContext";
import { errorMessage } from "@/errors";

export default function Reset() {
  const { t } = useTranslation();
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { logout } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!token) {
    return (
      <View className="flex-1 items-center justify-center bg-ink px-6">
        <View className="w-full max-w-sm gap-4 rounded-lg border border-border bg-surface p-6">
          <Text className="text-center text-2xl font-bold text-fg">{t("auth.reset.title")}</Text>
          <Text className="text-danger">{t("auth.reset.missingToken")}</Text>
          <Link href="/forgot">
            <Text className="text-sm text-primary">{t("auth.reset.requestNewLink")}</Text>
          </Link>
        </View>
      </View>
    );
  }

  const resetToken = token;

  async function handleSubmit() {
    setError("");
    if (password !== confirm) {
      setError(t("auth.reset.mismatch"));
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword(resetToken, password);
      await logout();
      router.replace("/login");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior="padding"
      className="flex-1 bg-ink"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", alignItems: "center" }}
        keyboardShouldPersistTaps="handled"
        className="px-6"
      >
        <View className="w-full max-w-sm gap-4 rounded-lg border border-border bg-surface p-6">
          <Text className="text-center text-2xl font-bold text-fg">{t("auth.reset.title")}</Text>

          <Input
            value={password}
            onChangeText={setPassword}
            placeholder={t("auth.reset.newPassword")}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
          />

          <Input
            value={confirm}
            onChangeText={setConfirm}
            placeholder={t("auth.reset.confirmPassword")}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="new-password"
            textContentType="newPassword"
          />

          {error ? <Text className="text-sm text-danger">{error}</Text> : null}

          <Button label={t("auth.reset.submit")} onPress={handleSubmit} loading={submitting} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}