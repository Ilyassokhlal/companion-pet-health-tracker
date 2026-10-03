import { Link, useLocation } from "react-router-dom";
import { Clock, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";

// The banner counts down the last week before the account locks, the same week the warning emails start.
const WARN_DAYS = 7;

// Shows the end of the free month, or of a plan that won't renew, coming. Then stays for good once the account is locked, saying plainly what still works and what has stopped.
export default function PremiumBanner() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { pathname } = useLocation();

  // The subscribe screen explains all of this itself
  if (!user || pathname === "/premium") return null;
  const locked = user.access === "locked";
  const ending = !locked && user.days_until_locked !== null && user.days_until_locked <= WARN_DAYS;
  if (!locked && !ending) return null;

  const days = t("dashboard.days", { count: user.days_until_locked ?? 0 });
  // An account that had premium and lost it has nothing to do with the free month any more
  const title = locked
    ? (user.premium_expires_at ? t("premiumBanner.endedTitle") : t("premiumBanner.trialOverTitle"))
    : (user.access === "trial" ? t("premiumBanner.endingTitle", { days }) : t("premiumBanner.premiumEndingTitle", { days }));

  return (
    <div className={`border-s-4 px-4 sm:px-6 py-3 ${locked ? "border-danger bg-danger/10" : "border-warning bg-warning/10"}`} role="status">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          {locked
            ? <Lock size={20} className="mt-0.5 shrink-0 text-danger" />
            : <Clock size={20} className="mt-0.5 shrink-0 text-warning" />}
          <div>
            <p className="font-semibold text-fg">{title}</p>
            <p className="text-sm text-muted">{locked ? t("premiumBanner.lockedBody") : t("premiumBanner.endingBody")}</p>
          </div>
        </div>
        <Link
          to="/premium"
          className="shrink-0 self-start rounded-lg bg-primary px-4 py-2 font-medium text-on-primary transition-all duration-150 hover:bg-primary-hover active:scale-[0.98] sm:self-auto"
        >
          {t("premiumBanner.action")}
        </Link>
      </div>
    </div>
  );
}