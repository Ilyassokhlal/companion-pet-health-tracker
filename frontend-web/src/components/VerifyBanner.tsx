import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { resendVerification } from "../api/auth";


// Displays a banner prompting the user to verify their email if it is not verified. It provides a button to resend the verification email and shows messages based on the success or failure of the resend action.
export default function VerifyBanner() {

  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // If there is no user or the user's email is already verified, the banner is not displayed.
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
        <div className="border-s-4 border-warning bg-warning/10 px-4 sm:px-6 py-3" role="alert">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                    <AlertTriangle size={20} className="mt-0.5 shrink-0 text-warning" />
                    <div>
                        <p className="font-semibold text-fg">{t("verifyBanner.title")}</p>
                        <p className="text-sm text-muted">{t("verifyBanner.body")}</p>
                        {message && <p className="mt-1 text-sm text-fg">{message}</p>}
                    </div>
                </div>
                <button
                    onClick={handleResend}
                    disabled={sending}
                    className="shrink-0 self-start rounded-lg bg-warning px-4 py-2 font-medium text-on-primary transition-all duration-150 hover:brightness-110 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 sm:self-auto"
                >
                    {sending ? t("verifyBanner.sending") : t("verifyBanner.resend")}
                </button>
            </div>
        </div>
    );
}