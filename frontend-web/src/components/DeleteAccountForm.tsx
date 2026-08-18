import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { deleteAccount } from "../api/auth";
import { useNavigate } from "react-router-dom";
import Button from "./ui/Button";
import Input from "./ui/Input";

// DeleteAccountForm component allows the user to delete their account. It requires the user to confirm their action by entering their current password. Upon successful submission, it deletes the user's account and logs them out.
export default function DeleteAccountForm() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

    // Handle form submission for deleting the account. It validates the input, calls the deleteAccount API function, logs the user out upon success, and navigates them to the login page. It also handles error states and displays appropriate messages to the user.
    async function handleDelete(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await deleteAccount(password);
      logout();
      navigate("/login", { replace: true });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
    }
    
    // Render the delete account form with a confirmation step, input field for the current password, and submission handling with feedback messages.
    return (
        <section className="p-6 bg-surface border border-danger/30 rounded-xl shadow-soft mb-6">
            <h2 className="text-lg font-semibold mb-4">Delete Account</h2>
            {!confirming ? (
                <div>
                    <p className="mb-4 text-muted">
                        Deleting your account is permanent. Your pets, health records, photos and chat history all go with it.
                    </p>
                    <Button variant="danger" onClick={() => setConfirming(true)}>
                        Delete Account
                    </Button>
                </div>
            ) : (
                <form onSubmit={handleDelete}>
                    <div className="mb-4">
                        <label htmlFor="password" className="block text-sm text-muted mb-2">
                            Confirm Password
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
                    <div className="flex gap-2">
                        <Button type="submit" variant="danger" disabled={submitting}>
                            {submitting ? "Deleting..." : "Permanently delete"}
                        </Button>
                        <Button type="button" variant="secondary" onClick={() => setConfirming(false)}>
                            Cancel
                        </Button>
                    </div>
                </form>
            )}
        </section>
    );
}