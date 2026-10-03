import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check, Crown } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { openPortal, restorePurchase, startCheckout } from "../api/billing";
import type { Plan } from "../api/billing";
import { errorMessage } from "../errors";
import { premiumStatus } from "../premium";
import Button from "../components/ui/Button";

// What Stripe charges, tax included. Checkout shows the same price in the buyer's own currency.
const PLANS: { plan: Plan; price: string }[] = [
  { plan: "monthly", price: "$4.99" },
  { plan: "yearly", price: "$39.99" },
];

const INCLUDES = ["records", "tracking", "questions", "reminders"];

// Where Google Play subscriptions are changed or cancelled. A phone purchase can't be managed from the web.
const PLAY_SUBSCRIPTIONS = "https://play.google.com/store/account/subscriptions";

// After checkout, how many times to re-read the account, two seconds apart, while the purchase reaches it
const ACTIVATION_CHECKS = 15;

// The subscribe screen: where the account stands, the plans, Stripe checkout and billing portal, and restoring a web purchase.
export default function Premium() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  // Stripe sends the user back with ?checkout=success or ?checkout=cancelled
  const checkout = searchParams.get("checkout");
  // Set by signup when this email already had its free month
  const returningTrialDays = (location.state as { returningTrialDays?: number } | null)?.returningTrialDays;
  const [busy, setBusy] = useState<Plan | "portal" | "restore" | null>(null);
  const [error, setError] = useState("");
  const [restored, setRestored] = useState(false);

  const active = user?.access === "premium" || user?.access === "granted";

  // Stripe returns the user before its webhook has reached the server, so keep re-reading the account until premium shows up
  useEffect(() => {
    if (checkout !== "success" || active) return;
    let checks = 0;
    const timer = window.setInterval(() => {
      checks += 1;
      refreshUser().catch(() => {});
      if (checks >= ACTIVATION_CHECKS) window.clearInterval(timer);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [checkout, active, refreshUser]);

  // Checkout and the billing portal are Stripe's own pages, so card details never touch Companion
  async function goToStripe(which: Plan | "portal") {
    setError("");
    setBusy(which);
    try {
      window.location.href = which === "portal" ? await openPortal() : await startCheckout(which);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(null);
    }
  }

  async function handleRestore() {
    setError("");
    setBusy("restore");
    try {
      await restorePurchase();
      await refreshUser();
      setRestored(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  if (!user) return null;

  const notice =
    restored ? t("premium.restored")
    : checkout === "success" ? (active ? t("premium.checkoutWelcome") : t("premium.checkoutSuccess"))
    : checkout === "cancelled" ? t("premium.checkoutCancelled")
    : returningTrialDays === undefined ? null
    : returningTrialDays === 0 ? t("premium.returningNone")
    : t("premium.returningSome", { days: t("dashboard.days", { count: returningTrialDays }) });

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto space-y-6">
      <div className="text-center">
        <Crown size={36} className="mx-auto mb-3 text-primary" />
        <h1 className="text-2xl font-bold">{t("premium.title")}</h1>
        <p className="mt-1 text-muted">{t("premium.subtitle")}</p>
      </div>

      {notice && (
        <p className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-fg" role="status">{notice}</p>
      )}

      <section className="p-6 bg-surface border border-border rounded-xl shadow-soft">
        <p className={`font-semibold ${user.access === "locked" ? "text-danger" : "text-fg"}`}>{premiumStatus(user)}</p>
        {!active && <p className="mt-2 text-sm text-muted">{t("premium.readOnly")}</p>}
        {user.has_web_subscription && (
          <Button variant="secondary" onClick={() => goToStripe("portal")} disabled={busy !== null} className="mt-4">
            {busy === "portal" ? t("premium.redirecting") : t("premium.manage")}
          </Button>
        )}
        {user.access === "premium" && !user.has_web_subscription && (
          <p className="mt-4 text-sm text-muted">
            {t("premium.managePlay")}{" "}
            <a href={PLAY_SUBSCRIPTIONS} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              {t("premium.openPlay")}
            </a>
          </p>
        )}
      </section>

      <section className="p-6 bg-surface border border-border rounded-xl shadow-soft">
        <h2 className="text-lg font-semibold mb-3">{t("premium.includesTitle")}</h2>
        <ul className="space-y-2">
          {INCLUDES.map((key) => (
            <li key={key} className="flex items-start gap-2">
              <Check size={18} className="mt-0.5 shrink-0 text-primary" />
              <span>{t(`premium.includes.${key}`)}</span>
            </li>
          ))}
        </ul>
      </section>

      {!active && (
        <section className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            {PLANS.map(({ plan, price }) => (
              <div key={plan} className="flex flex-col p-6 bg-surface border border-border rounded-xl shadow-soft">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold">{t(`premium.${plan}`)}</h3>
                  {plan === "yearly" && (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">{t("premium.save")}</span>
                  )}
                </div>
                <p className="mt-2 mb-4 text-2xl font-bold">
                  {plan === "monthly" ? t("premium.perMonth", { price }) : t("premium.perYear", { price })}
                </p>
                <Button onClick={() => goToStripe(plan)} disabled={busy !== null} className="mt-auto w-full">
                  {busy === plan ? t("premium.redirecting") : t("premium.subscribe")}
                </Button>
              </div>
            ))}
          </div>
          {user.access === "trial" && <p className="text-sm text-fg">{t("premium.billingNow")}</p>}
          <p className="text-sm text-muted">{t("premium.smallPrint")}</p>
          <p className="text-sm text-muted">{t("premium.refund")}</p>
        </section>
      )}

      {error && <p className="text-danger text-sm" role="alert">{error}</p>}

      {!active && (
        <section className="p-6 bg-surface border border-border rounded-xl shadow-soft">
          <h2 className="text-lg font-semibold mb-2">{t("premium.restoreTitle")}</h2>
          <p className="mb-4 text-sm text-muted">{t("premium.restoreBody")}</p>
          <Button variant="secondary" onClick={handleRestore} disabled={busy !== null}>
            {busy === "restore" ? t("premium.restoring") : t("premium.restore")}
          </Button>
        </section>
      )}

      <p className="text-center text-sm text-muted">
        <Link to="/terms" className="hover:underline">{t("premium.terms")}</Link>
        {" · "}
        <Link to="/privacy" className="hover:underline">{t("premium.privacy")}</Link>
      </p>
    </div>
  );
}