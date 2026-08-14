import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { deleteAccount } from "../api/auth";
import { useNavigate } from "react-router-dom";

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
        <section className="max-w-md mx-auto p-4 bg-white shadow rounded">
            <h2 className="text-2xl font-bold mb-4">Delete Account</h2>
            {!confirming ? (
                <div>
                    <p className="mb-4 text-gray-700">
                        Deleting your account is permanent and cannot be undone. All your data will be lost.
                    </p>
                    <button
                        onClick={() => setConfirming(true)}
                        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                    >
                        Delete Account
                    </button>
                </div>
            ) : (
                <form onSubmit={handleDelete}>
                    <div className="mb-4">
                        <label htmlFor="password" className="block text-gray-700 mb-2">
                            Confirm Password
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
                    <button
                        type="submit"
                        disabled={submitting}
                        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50"
                    >
                        {submitting ? "Deleting..." : "Delete Account"}
                    </button>
                </form>
            )}
        </section>
    );
}