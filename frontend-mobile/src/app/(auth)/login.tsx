import { useState } from "react";
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { Link } from "expo-router";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { useAuth } from "@/auth/AuthContext";

export default function Login() {
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
      behavior={Platform.OS === "ios" ? "padding" : "height"}
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
        <Text className="mb-6 text-center text-2xl font-bold text-fg">Welcome to Companion</Text>
        <View className="w-full max-w-sm gap-4 rounded-lg border border-border bg-surface p-6">
          <Text className="text-center text-2xl font-bold text-fg">Login</Text>

          <Input
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
          />

          <Input
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password"
            textContentType="password"
          />

          {error ? <Text className="text-sm text-danger">{error}</Text> : null}

          <Button label="Login" onPress={handleSubmit} loading={submitting} />

          <Link href="/register">
            <Text className="text-sm text-primary">New user? Register here</Text>
          </Link>
          <Link href="/forgot">
            <Text className="text-sm text-primary">Forgot your password?</Text>
          </Link>
        </View>
        <Text className="mt-6 max-w-sm text-center text-sm text-muted">
          Responses within this app do not constitute professional veterinary advice. Please
          consult a veterinarian for any health concerns regarding your pet.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}