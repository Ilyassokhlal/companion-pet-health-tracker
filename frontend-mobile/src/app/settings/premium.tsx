import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";

import { useAuth } from "@/auth/AuthContext";
import { useTheme } from "@/theme/ThemeContext";
import { themeColors } from "@/theme/palette";
import { premiumStatus } from "@/premium";

const INCLUDES = ["records", "tracking", "questions", "reminders"];

// Where Google Play subscriptions are changed or cancelled
const PLAY_SUBSCRIPTIONS = "https://play.google.com/store/account/subscriptions";

// The legal pages are hosted by the web app, always in production, since store reviewers fetch them
const SITE = "https://mycompanion.pet";

// The subscribe screen: where the account stands and what Premium includes.
export default function Premium() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, returningTrialDays, clearReturningTrialDays } = useAuth();
  const { theme, accent } = useTheme();
  const colors = themeColors(theme, accent);
  // Read once, then cleared, so the signup notice belongs to this visit only
  const [returning] = useState(returningTrialDays);
  useEffect(() => {
    clearReturningTrialDays();
  }, [clearReturningTrialDays]);

  if (!user) return null;
  const active = user.access === "premium" || user.access === "granted";
  const notice =
    returning === null ? null
    : returning === 0 ? t("premium.returningNone")
    : t("premium.returningSome", { days: t("dashboard.days", { count: returning }) });

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16 }}
    >
      <View className="mb-6 items-center">
        <Ionicons name="diamond" size={36} color={colors.primary} />
        <Text className="mt-3 text-2xl font-bold text-fg">{t("premium.title")}</Text>
        <Text className="mt-1 text-center text-muted">{t("premium.subtitle")}</Text>
      </View>

      {notice ? (
        <View style={{ borderColor: colors.primary }} className="mb-6 rounded-xl border bg-surface p-4">
          <Text className="text-fg">{notice}</Text>
        </View>
      ) : null}

      <View className="mb-6 rounded-xl border border-border bg-surface p-5">
        <Text className={`font-semibold ${user.access === "locked" ? "text-danger" : "text-fg"}`}>{premiumStatus(user)}</Text>
        {!active ? <Text className="mt-2 text-sm text-muted">{t("premium.readOnly")}</Text> : null}
        {user.access === "premium" && user.has_web_subscription ? (
          // Google Play doesn't allow pointing to another way to pay, so a web subscription is only named, not linked
          <Text className="mt-3 text-sm text-muted">{t("premium.manageWeb")}</Text>
        ) : null}
        {user.access === "premium" && !user.has_web_subscription ? (
          <View className="mt-3">
            <Text className="text-sm text-muted">{t("premium.managePlay")}</Text>
            <Pressable onPress={() => Linking.openURL(PLAY_SUBSCRIPTIONS)} className="mt-2 self-start active:opacity-70">
              <Text style={{ color: colors.primary }} className="font-semibold">{t("premium.openPlay")}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>

      <View className="mb-6 rounded-xl border border-border bg-surface p-5">
        <Text className="mb-3 text-lg font-semibold text-fg">{t("premium.includesTitle")}</Text>
        {INCLUDES.map((key) => (
          <View key={key} className="mb-2 flex-row items-start gap-2">
            <Ionicons name="checkmark" size={18} color={colors.primary} />
            <Text className="flex-1 text-fg">{t(`premium.includes.${key}`)}</Text>
          </View>
        ))}
      </View>

      <View className="mb-6 flex-row justify-center gap-6">
        <Pressable onPress={() => WebBrowser.openBrowserAsync(`${SITE}/terms`)} className="active:opacity-70">
          <Text className="text-sm text-muted">{t("premium.terms")}</Text>
        </Pressable>
        <Pressable onPress={() => WebBrowser.openBrowserAsync(`${SITE}/privacy`)} className="active:opacity-70">
          <Text className="text-sm text-muted">{t("premium.privacy")}</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
