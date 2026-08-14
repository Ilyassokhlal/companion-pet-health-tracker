import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { resendVerification } from "../api/auth";


// Displays a banner prompting the user to verify their email if it is not verified. It provides a button to resend the verification email and shows messages based on the success or failure of the resend action.
export default function VerifyBanner() {

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
      setMessage("Sent — check your inbox.");
    } catch (err) {
      setMessage((err as Error).message);
      await refreshUser();
    } finally {
      setSending(false);
    }
  }
    return (
        <div className="bg-amber-100 border-l-4 border-amber-500 text-amber-700 p-4" role="alert">
            <p className="font-bold">Email verification required</p>
            <p className="text-sm">You need to verify your email address to access all features.</p>
            <button
                onClick={handleResend}
                disabled={sending}
                className="mt-2 bg-amber-500 text-white px-3 py-1 rounded hover:bg-amber-600 disabled:opacity-50"
            >
                {sending ? "Sending..." : "Resend Verification Email"}
            </button>
            {message && <p className="mt-2 text-sm">{message}</p>}
        </div>
    );
}
