import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

export default function Login() {
    const { t } = useTranslation();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setError(null);
      setSubmitting(true);
      try {
        await login(email, password);
      navigate("/dashboard", { replace: true });
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setSubmitting(false);
      }
    }
      return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 p-8 bg-surface border border-border rounded-lg">
        <h1 className="text-2xl font-bold text-center">{t("auth.login.title")}</h1>
        <Input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          placeholder={t("common.email")}
          autoComplete="email"
        />
        <Input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          placeholder={t("common.password")}
          autoComplete="current-password"
        />
        {error && <p className="text-danger text-sm">{error}</p>}
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? t("auth.login.submitting") : t("auth.login.submit")}
        </Button>
        <Link to="/register" className="text-primary hover:underline text-sm block">
          {t("auth.login.registerLink")}
        </Link>
        <Link to="/forgot" className="text-primary hover:underline text-sm block">
          {t("auth.login.forgotLink")}
        </Link>
      </form>
    </div>
  );
}