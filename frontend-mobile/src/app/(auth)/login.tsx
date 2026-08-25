import { useState } from "react";
import { Image, KeyboardAvoidingView, ScrollView, Text, View } from "react-native";
import { Link } from "expo-router";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useAuth } from "@/auth/AuthContext";
import { useTranslation } from "react-i18next";

export default function Login() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
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
        <Image
          source={require("@/assets/images/logo.png")}
          resizeMode="contain"
          className="mb-4 h-36 w-36"
        />
        <Text className="mb-6 text-center text-2xl font-bold text-fg">{t("auth.welcome")}</Text>
        <View className="w-full max-w-sm gap-4 rounded-lg border border-border bg-surface p-6">
          <Text className="text-center text-2xl font-bold text-fg">{t("auth.login.title")}</Text>

          <Input
            value={email}
            onChangeText={setEmail}
            placeholder={t("common.email")}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
          />

          <Input
            value={password}
            onChangeText={setPassword}
            placeholder={t("common.password")}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            textContentType="password"
          />

          {error ? <Text className="text-sm text-danger">{error}</Text> : null}

          <Button label={t("auth.login.submit")} onPress={handleSubmit} loading={submitting} />

          <Link href="/register">
            <Text className="text-sm text-primary">{t("auth.login.registerLink")}</Text>
          </Link>
          <Link href="/forgot">
            <Text className="text-sm text-primary">{t("auth.login.forgotLink")}</Text>
          </Link>
        </View>
        <Text className="mt-6 max-w-sm text-center text-sm text-muted">
          {t("common.disclaimer")}
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}