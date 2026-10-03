import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { router } from "expo-router";

import { useAuth } from "@/auth/AuthContext";
import { useTheme } from "@/theme/ThemeContext";
import { themeColors } from "@/theme/palette";
import { PREMIUM_ROUTE } from "@/premium";

// The banner counts down the last week before the account locks, the same week the warning emails start.
const WARN_DAYS = 7;

// Sits on top of the tab bar, so it shows on every tab. Counts down the end of the free month, or of a plan that won't
// renew, then stays for good once the account is locked, saying plainly what still works and what has stopped.
export default function PremiumBanner() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { theme, accent } = useTheme();
  const colors = themeColors(theme, accent);

  if (!user) return null;
  const locked = user.access === "locked";
  const ending = !locked && user.days_until_locked !== null && user.days_until_locked <= WARN_DAYS;
  if (!locked && !ending) return null;

  const days = t("dashboard.days", { count: user.days_until_locked ?? 0 });
  // An account that had premium and lost it has nothing to do with the free month any more
  const title = locked
    ? (user.premium_expires_at ? t("premiumBanner.endedTitle") : t("premiumBanner.trialOverTitle"))
    : (user.access === "trial" ? t("premiumBanner.endingTitle", { days }) : t("premiumBanner.premiumEndingTitle", { days }));
  const tone = locked ? colors.danger : colors.warning;

  return (
    <Pressable
      onPress={() => router.navigate(PREMIUM_ROUTE)}
      accessibilityRole="button"
      style={{ marginHorizontal: 14, marginBottom: 8, backgroundColor: colors.surface, borderColor: tone }}
      className="flex-row items-start gap-3 rounded-2xl border px-4 py-3 active:opacity-70"
    >
      <Ionicons name={locked ? "lock-closed" : "time-outline"} size={20} color={tone} />
      <View className="flex-1">
        <Text className="font-semibold text-fg">{title}</Text>
        <Text className="mt-0.5 text-sm text-muted">{locked ? t("premiumBanner.lockedBody") : t("premiumBanner.endingBody")}</Text>
        <Text style={{ color: colors.primary }} className="mt-1 text-sm font-semibold">{t("premiumBanner.action")}</Text>
      </View>
    </Pressable>
  );
}
