import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";

import Button from "@/components/ui/Button";
import { useAuth } from "@/auth/AuthContext";
import { useTheme } from "@/theme/ThemeContext";
import { themeColors } from "@/theme/palette";
import { errorMessage } from "@/errors";
import { premiumStatus } from "@/premium";
import { buy, loadPlans, restoreStorePurchases, storeAvailable, syncAccount, yearlySaving } from "@/purchases";
import type { Plan } from "@/purchases";
import type { User } from "@/types";

const INCLUDES = ["records", "tracking", "questions", "reminders"];

// Where Google Play subscriptions are changed or cancelled
const PLAY_SUBSCRIPTIONS = "https://play.google.com/store/account/subscriptions";

// The legal pages are hosted by the web app, always in production, since store reviewers fetch them
const SITE = "https://mycompanion.pet";

const hasPremium = (user: User | null) => user?.access === "premium" || user?.access === "granted";

// The subscribe screen: where the account stands, what Premium includes, and buying or restoring it through Google Play.
export default function Premium() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, refreshUser, returningTrialDays, clearReturningTrialDays } = useAuth();
  const { theme, accent } = useTheme();
  const colors = themeColors(theme, accent);
  // Read once, then cleared, so the signup notice belongs to this visit only
  const [returning] = useState(returningTrialDays);
  const [plans, setPlans] = useState<Plan[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const active = hasPremium(user);

  useEffect(() => {
    clearReturningTrialDays();
  }, [clearReturningTrialDays]);

  // The plans come from Google Play, priced in the buyer's own currency
  useEffect(() => {
    if (active || !storeAvailable) return;
    loadPlans().then(setPlans).catch(() => setPlans([]));
  }, [active]);

  async function handleBuy(plan: Plan) {
    setError("");
    setMessage("");
    setBusy(plan.period);
    try {
      let bought = false;
      try {
        bought = await buy(plan);
      } catch {
        setError(t("premium.purchaseFailed"));
      }
      if (bought) {
        // Google has charged by now. If the server can't confirm yet, the webhook switches premium on shortly.
        const updated = await syncAccount().catch(() => null);
        await refreshUser().catch(() => {});
        setMessage(hasPremium(updated) ? t("premium.welcome") : t("premium.purchasePending"));
      }
    } finally {
      setBusy(null);
    }
  }

  async function handleRestore() {
    setError("");
    setMessage("");
    setBusy("restore");
    try {
      await restoreStorePurchases();
      const updated = await syncAccount();
      await refreshUser();
      setMessage(hasPremium(updated) ? t("premium.restored") : t("premium.nothingRestored"));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  if (!user) return null;
  const notice =
    returning === null ? null
    : returning === 0 ? t("premium.returningNone")
    : t("premium.returningSome", { days: t("dashboard.days", { count: returning }) });
  const saving = plans ? yearlySaving(plans) : null;

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

      {message ? (
        <View style={{ borderColor: colors.primary }} className="mb-6 rounded-xl border bg-surface p-4">
          <Text className="text-fg">{message}</Text>
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

      {!active ? (
        <View className="mb-6 rounded-xl border border-border bg-surface p-5">
          {!storeAvailable ? (
            <Text className="text-sm text-muted">{t("premium.storeUnavailable")}</Text>
          ) : plans === null ? (
            <ActivityIndicator color={colors.primary} />
          ) : plans.length === 0 ? (
            <Text className="text-sm text-muted">{t("premium.plansUnavailable")}</Text>
          ) : (
            <View className="gap-3">
              {plans.map((plan) => (
                <View key={plan.period} className="rounded-lg border border-border p-4">
                  <View className="flex-row items-center justify-between gap-2">
                    <Text className="text-lg font-semibold text-fg">{t(`premium.${plan.period}`)}</Text>
                    {plan.period === "yearly" && saving ? (
                      <Text style={{ color: colors.primary }} className="text-xs font-semibold">{t("premium.savePercent", { percent: saving })}</Text>
                    ) : null}
                  </View>
                  <Text className="mb-3 mt-1 text-2xl font-bold text-fg">
                    {plan.period === "monthly" ? t("premium.perMonth", { price: plan.price }) : t("premium.perYear", { price: plan.price })}
                  </Text>
                  <Button label={t("premium.subscribe")} onPress={() => handleBuy(plan)} loading={busy === plan.period} disabled={busy !== null} />
                </View>
              ))}
            </View>
          )}
          {user.access === "trial" ? <Text className="mt-3 text-sm text-fg">{t("premium.billingNow")}</Text> : null}
          <Text className="mt-3 text-sm text-muted">{t("premium.smallPrintPlay")}</Text>
        </View>
      ) : null}

      {error ? <Text className="mb-6 text-sm text-danger">{error}</Text> : null}

      {!active ? (
        <View className="mb-6 rounded-xl border border-border bg-surface p-5">
          <Text className="mb-2 text-lg font-semibold text-fg">{t("premium.restoreTitle")}</Text>
          <Text className="mb-4 text-sm text-muted">{t("premium.restoreBodyPlay")}</Text>
          <Button
            label={t("premium.restore")}
            variant="secondary"
            onPress={handleRestore}
            loading={busy === "restore"}
            disabled={busy !== null || !storeAvailable}
          />
        </View>
      ) : null}

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
