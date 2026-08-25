import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { resetPassword } from "../api/auth";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

export default function Reset() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // if (!token) -> render "That link is missing its token." with a Link to /forgot
  if (!token) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="w-full max-w-md p-8 bg-surface border border-border rounded-xl shadow-soft">
            <h1 className="text-2xl font-bold mb-6">{t("auth.reset.title")}</h1>
            <p className="text-danger mb-4">{t("auth.reset.missingToken")}</p>
            <p className="mt-4">
              <Link to="/forgot" className="text-primary hover:underline">
                {t("auth.reset.requestNewLink")}
                </Link>
            </p>
        </div>
      </div>
    );
  }

  // If token is present, render the reset password form
  const resetToken = token;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError(t("auth.reset.mismatch"));
      return;
    }
    setSubmitting(true);
    try {
      await resetPassword(resetToken, password);
      navigate("/login", { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-8 bg-surface border border-border rounded-xl shadow-soft">
        <h1 className="text-2xl font-bold mb-6">{t("auth.reset.title")}</h1>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="password" className="block text-muted mb-2">
              {t("auth.reset.newPassword")}
            </label>
            <Input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="confirm" className="block text-muted mb-2">
              {t("auth.reset.confirmPassword")}
            </label>
            <Input
              type="password"
              id="confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          {error && <p className="text-danger text-sm mb-4">{error}</p>}
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? t("auth.reset.submitting") : t("auth.reset.submit")}
          </Button>
        </form>
      </div>
    </div>
  );

}