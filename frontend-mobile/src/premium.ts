import { useEffect } from "react";
import { t } from "i18next";
import { useRouter } from "expo-router";

import { useAuth } from "@/auth/AuthContext";
import { dateLocale } from "@/dates";
import type { User } from "@/types";

// The subscribe screen, reached from the banner, Settings, signup and any locked action.
export const PREMIUM_ROUTE = "/settings/premium" as const;

// One sentence on where the account stands, shared by the subscribe screen and Settings.
export function premiumStatus(user: User): string {
  const until = user.premium_expires_at
    ? new Date(user.premium_expires_at).toLocaleDateString(dateLocale(), { day: "numeric", month: "long", year: "numeric" })
    : "";
  switch (user.access) {
    case "trial":
      return t("premium.status.trial", { days: t("dashboard.days", { count: user.trial_days_left }) });
    case "premium":
      // A plan that won't renew says when it ends instead of looking like it carries on
      return user.days_until_locked === null
        ? t("premium.status.active", { date: until })
        : t("premium.status.activeEnding", { date: until });
    case "granted":
      return until ? t("premium.status.grantedUntil", { date: until }) : t("premium.status.lifetime");
    case "locked":
      // An account that had premium and lost it has nothing to do with the free month any more
      return user.premium_expires_at ? t("premium.status.ended") : t("premium.status.trialOver");
  }
}

// Every add and edit form opens in a modal. A locked account goes straight to the subscribe screen instead of a form
// it can't save, so the modal is never shown. Returns whether the modal should show.
export function useLockedRedirect(visible: boolean, onClose: () => void): boolean {
  const { user } = useAuth();
  const router = useRouter();
  const locked = user?.access === "locked";

  useEffect(() => {
    if (visible && locked) {
      onClose();
      router.navigate(PREMIUM_ROUTE);
    }
  }, [visible, locked, onClose, router]);

  return visible && !locked;
}
