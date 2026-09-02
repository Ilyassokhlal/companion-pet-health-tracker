import { useState } from "react";
import { useTranslation } from "react-i18next";
import { changePassword } from "../api/auth";
import { errorMessage } from "../errors";
import Button from "./ui/Button";
import Input from "./ui/Input";

// Lets a signed-in user change their password. changePassword() stores the fresh
// token the API returns, so this session survives the change while others die.
export default function ChangePasswordForm() {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Validate locally first, then call the API.
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("");
    setError("");
    setSubmitting(true);

    if (newPassword !== confirmPassword) {
      setError(t("account.password.mismatch"));
      setSubmitting(false);
      return;
    }

    if (newPassword.length < 8) {
      setError(t("account.password.tooShort"));
      setSubmitting(false);
      return;
    }

    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage(t("account.password.changed"));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <label htmlFor="current-password" className="block text-sm text-muted mb-2">
          {t("account.password.current")}
        </label>
        <Input
          type="password"
          id="current-password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          autoComplete="current-password"
          required
        />
      </div>
      <div className="mb-4">
        <label htmlFor="new-password" className="block text-sm text-muted mb-2">
          {t("account.password.new")}
        </label>
        <Input
          type="password"
          id="new-password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
      </div>
      <div className="mb-4">
        <label htmlFor="confirm-password" className="block text-sm text-muted mb-2">
          {t("account.password.confirm")}
        </label>
        <Input
          type="password"
          id="confirm-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
      </div>
      {error && <p className="text-danger text-sm mb-4">{error}</p>}
      {message && <p className="text-primary text-sm mb-4">{message}</p>}
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? t("account.password.submitting") : t("account.password.submit")}
      </Button>
    </form>
  );
}