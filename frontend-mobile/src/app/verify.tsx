import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { Link, useLocalSearchParams } from "expo-router";

import { verifyEmail } from "@/api/auth";
import { useAuth } from "@/auth/AuthContext";

export default function Verify() {
  const [status, setStatus] = useState<"verifying" | "ok" | "error">("verifying");
  const [message, setMessage] = useState<string | null>(null);
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { user, refreshUser } = useAuth();

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("That link is missing its token.");
      return;
    }
    async function verify(t: string) {
      try {
        await verifyEmail(t);
        setStatus("ok");
        if (user) await refreshUser();
      } catch (err) {
        setStatus("error");
        setMessage((err as Error).message);
      }
    }
    verify(token);
  }, [token]);

  return (
    <View className="flex-1 items-center justify-center bg-ink px-6">
      <View className="w-full max-w-sm gap-4 rounded-lg border border-border bg-surface p-6">
        <Text className="text-center text-2xl font-bold text-fg">Verify Email</Text>

        {status === "verifying" ? <Text className="text-muted">Verifying…</Text> : null}

        {status === "ok" ? (
          <Text className="text-fg">Email verified successfully.</Text>
        ) : null}

        {status === "error" ? (
          <Text className="text-danger">{message}</Text>
        ) : null}

        <Link href="/login">
          <Text className="text-sm text-primary">Continue</Text>
        </Link>
      </View>
    </View>
  );
}