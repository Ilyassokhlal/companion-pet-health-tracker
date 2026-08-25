import { useState } from "react";
import { KeyboardAvoidingView, ScrollView, Text, View } from "react-native";
import { Link } from "expo-router";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { forgotPassword } from "@/api/auth";
import { useTranslation } from "react-i18next";

export default function Forgot() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError("");
    setSubmitting(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
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
          <Text className="text-center text-2xl font-bold text-fg">{t("auth.forgot.title")}</Text>

          {sent ? (
            <Text className="text-muted">
              {t("auth.forgot.sent")}
            </Text>
          ) : (
            <>
              <Input
                value={email}
                onChangeText={setEmail}
                placeholder={t("common.email")}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
              />
              {error ? <Text className="text-sm text-danger">{error}</Text> : null}
              <Button label={t("auth.forgot.submit")} onPress={handleSubmit} loading={submitting} />
            </>
          )}

          <Link href="/login">
            <Text className="text-sm text-primary">{t("auth.forgot.backLink")}</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}