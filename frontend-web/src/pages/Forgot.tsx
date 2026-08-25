import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { forgotPassword } from "../api/auth";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

// Forgot password page component. Allows the user to enter their email to receive a password reset link.
export default function Forgot() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

    return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-8 bg-surface border border-border rounded-lg">
        <h1 className="text-2xl font-bold mb-6">{t("auth.forgot.title")}</h1>
        {sent ? (
          <p className="text-muted">
            {t("auth.forgot.sent")}
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-muted mb-2" htmlFor="email">
                {t("common.email")}
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-danger text-sm mb-4">{error}</p>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? t("auth.forgot.submitting") : t("auth.forgot.submit")}
            </Button>
          </form>
        )}
        <p className="mt-4">
          <Link to="/login" className="text-primary hover:underline">
            {t("auth.forgot.backLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}