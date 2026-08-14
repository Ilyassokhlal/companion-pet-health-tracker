import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { changeEmail } from "../api/auth";


// ChangeEmailForm component allows the user to change their email address. It requires the user to input their new email and current password for verification. Upon successful submission, it updates the user's email and prompts them to check their new email for a verification link.
export default function ChangeEmailForm() {
  const { user, refreshUser } = useAuth();
  const [email, setEmail] = useState(user?.email || "");
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
            setMessage("Email changed successfully. Please check your new email for a verification link.");
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setSubmitting(false);
        }
    }
    // Render the change email form with input fields for the new email and current password, along with submission handling and feedback messages.
    return (
        <section className="max-w-md mx-auto p-4 bg-white shadow rounded">
            <h2 className="text-2xl font-bold mb-4">Change Email</h2>
            <form onSubmit={handleSubmit}>
                <div className="mb-4">
                    <label htmlFor="email" className="block text-gray-700 mb-2">
                        New Email
                    </label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="w-full px-3 py-2 border rounded"
                    />
                </div>
                <div className="mb-4">
                    <label htmlFor="password" className="block text-gray-700 mb-2">
                        Current Password
                    </label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                        required
                        className="w-full px-3 py-2 border rounded"
                    />
                </div>
                {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
                {message && <p className="text-green-600 text-sm mb-4">{message}</p>}
                <button
                    type="submit"
                    disabled={submitting}
                    className={`w-full py-2 px-4 bg-blue-500 text-white rounded ${submitting ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-600"}`}
                >
                    {submitting ? "Submitting..." : "Change Email"}
                </button>
            </form>
        </section>
    );
}