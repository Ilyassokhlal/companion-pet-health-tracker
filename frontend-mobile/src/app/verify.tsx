import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Text, View } from "react-native";
import { Link, useLocalSearchParams } from "expo-router";

import { verifyEmail } from "@/api/auth";
import { useAuth } from "@/auth/AuthContext";
import { errorMessage } from "@/errors";

export default function Verify() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<"verifying" | "ok" | "error">("verifying");
  const [message, setMessage] = useState<string | null>(null);
  const { token } = useLocalSearchParams<{ token?: string }>();
  const { user, refreshUser } = useAuth();

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage(t("auth.verify.missingToken"));
      return;
    }
    async function verify(t: string) {
      try {
        await verifyEmail(t);
        setStatus("ok");
        if (user) await refreshUser();
      } catch (err) {
        setStatus("error");
        setMessage(errorMessage(err));
      }
    }
    verify(token);
  }, [token]);

  return (
    <View className="flex-1 items-center justify-center bg-ink px-6">
      <View className="w-full max-w-sm gap-4 rounded-lg border border-border bg-surface p-6">
        <Text className="text-center text-2xl font-bold text-fg">{t("auth.verify.title")}</Text>

        {status === "verifying" ? <Text className="text-muted">{t("auth.verify.verifying")}</Text> : null}

        {status === "ok" ? (
          <Text className="text-fg">{t("auth.verify.success")}</Text>
        ) : null}

        {status === "error" ? (
          <Text className="text-danger">{message}</Text>
        ) : null}

        <Link href="/login">
          <Text className="text-sm text-primary">{t("auth.verify.continue")}</Text>
        </Link>
      </View>
    </View>
  );
}