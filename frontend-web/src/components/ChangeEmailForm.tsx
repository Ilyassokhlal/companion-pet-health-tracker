import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "../auth/AuthContext";
import { changeEmail } from "../api/auth";
import { errorMessage } from "../errors";
import Button from "./ui/Button";
import Input from "./ui/Input";


// ChangeEmailForm component allows the user to change their email address. It requires the user to input their new email and current password for verification. Upon successful submission, it updates the user's email and prompts them to check their new email for a verification link.
export default function ChangeEmailForm() {
    const { t } = useTranslation();
    const { refreshUser } = useAuth();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    // Handle form submission for changing the email. It validates the input, calls the changeEmail API function, and updates the user context upon success. It also handles error states and displays appropriate messages to the user.
    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setMessage("");
        setError("");
        setSubmitting(true);
        try {
            await changeEmail(email, password);
            await refreshUser();
            setEmail("");
            setPassword("");
            setMessage(t("account.email.sent"));
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setSubmitting(false);
        }
    }
    // Render the change email form with input fields for the new email and current password, along with submission handling and feedback messages.
    return (

            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label htmlFor="email" className="block text-sm text-muted mb-2">
                        {t("account.email.label")}
                    </label>
                    <Input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div className="mb-4">
                    <label htmlFor="password" className="block text-sm text-muted mb-2">
                        {t("account.email.currentPassword")}
                    </label>
                    <Input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        required
                    />
                </div>
                {error && <p className="text-danger text-sm mb-4">{error}</p>}
                {message && <p className="text-primary text-sm mb-4">{message}</p>}
                <Button type="submit" disabled={submitting} className="w-full">
                    {submitting ? t("account.email.submitting") : t("account.email.submit")}
                </Button>
            </form>
    );
}