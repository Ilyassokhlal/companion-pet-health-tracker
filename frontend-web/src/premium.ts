import i18n from "i18next";
import type { User } from "./types";
import { dateLocale } from "./dates";

// One sentence on where the account stands, shared by the subscribe screen and Settings.
export function premiumStatus(user: User): string {
  const until = user.premium_expires_at
    ? new Date(user.premium_expires_at).toLocaleDateString(dateLocale(), { day: "numeric", month: "long", year: "numeric" })
    : "";
  switch (user.access) {
    case "trial":
      return i18n.t("premium.status.trial", { days: i18n.t("dashboard.days", { count: user.trial_days_left }) });
    case "premium":
      return i18n.t("premium.status.active", { date: until });
    case "granted":
      return until ? i18n.t("premium.status.grantedUntil", { date: until }) : i18n.t("premium.status.lifetime");
    case "locked":
      // An account that had premium and lost it has nothing to do with the free month any more
      return user.premium_expires_at ? i18n.t("premium.status.ended") : i18n.t("premium.status.trialOver");
  }
}