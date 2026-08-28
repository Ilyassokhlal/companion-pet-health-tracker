import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { useAuth } from "@/auth/AuthContext";
import { useTheme } from "@/theme/ThemeContext";
import { themeColors } from "@/theme/palette";
import { resendVerification } from "@/api/auth";

// A bar under the Dashboard header while the account is unverified.
// Mobile is where this matters most. Push is gated on email_verified server-side, so notifications silently do nothing until it is set.
export default function VerifyBanner() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const { theme, accent } = useTheme();
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!user || user.email_verified) return null;

  async function handleResend() {
    setSending(true);
    setMessage(null);
    try {
      await resendVerification();
      setMessage(t("verifyBanner.sent"));
    } catch (err) {
      setMessage((err as Error).message);
      await refreshUser();
    } finally {
      setSending(false);
    }
  }

  return (
    <View className="border-b-2 border-warning bg-surface px-4 py-3">
      <View className="flex-row items-start gap-3">
        <Ionicons name="warning-outline" size={20} color={themeColors(theme, accent).warning} />
        <View className="flex-1">
          <Text className="font-semibold text-fg">{t("verifyBanner.title")}</Text>
          <Text className="mt-0.5 text-sm text-muted">{t("verifyBanner.body")}</Text>
          {message ? <Text className="mt-1 text-sm text-fg">{message}</Text> : null}
          <Pressable
            onPress={handleResend}
            disabled={sending}
            className={`mt-3 self-start rounded-lg bg-warning px-4 py-2 ${sending ? "opacity-50" : "active:opacity-70"}`}
          >
            <Text className="font-semibold text-on-primary">
              {sending ? t("verifyBanner.sending") : t("verifyBanner.resend")}
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}