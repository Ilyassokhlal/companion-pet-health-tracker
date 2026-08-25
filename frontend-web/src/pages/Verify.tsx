import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { verifyEmail } from "../api/auth";
import { useAuth } from "../auth/AuthContext";

// This component handles the email verification process. It retrieves the verification token from the URL parameters, attempts to verify the email using the API, and displays appropriate messages based on the verification status.
export default function Verify() {
  const { t } = useTranslation();
  // State variables to manage the verification status and any messages to display to the user.
  const [status, setStatus] = useState<"verifying" | "ok" | "error" | "missing">("verifying");
  const [message, setMessage] = useState<string | null>(null);
  const [params] = useSearchParams();
  const token = params.get("token");
  const { user, refreshUser } = useAuth();

    useEffect(() => {
        if (!token) {
            setStatus("missing");
            return;
        }
        async function verify(tok: string) {
            try {
                await verifyEmail(tok);
                setStatus("ok");
                if (user) await refreshUser();
            } catch (err) {
                setStatus("error");
                setMessage((err as Error).message);
            }
        }
        verify(token);
    }, [token]);

    return (
        <div className="p-4">
            {status === "verifying" && <p>{t("auth.verify.verifying")}</p>}
            {status === "missing" && (
                <p>
                    {t("auth.verify.missingToken")} <Link to="/login">{t("auth.verify.loginLink")}</Link>.
                </p>
            )}
            {status === "ok" && (
                <p>
                    {t("auth.verify.success")} <Link to="/">{t("auth.verify.homeLink")}</Link>.
                </p>
            )}
            {status === "error" && (
                <p>
                    {message} <Link to="/login">{t("auth.verify.loginLink")}</Link>.
                </p>
            )}
        </div>
    );
}