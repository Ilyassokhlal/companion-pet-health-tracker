import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { verifyEmail } from "../api/auth";
import { useAuth } from "../auth/AuthContext";

// This component handles the email verification process. It retrieves the verification token from the URL parameters, attempts to verify the email using the API, and displays appropriate messages based on the verification status.
export default function Verify() {
  // State variables to manage the verification status and any messages to display to the user. The status can be "verifying", "ok", or "error".
  const [status, setStatus] = useState<"verifying" | "ok" | "error">("verifying");
  const [message, setMessage] = useState<string | null>(null);
  const [params] = useSearchParams();
  const token = params.get("token");
  const { user, refreshUser } = useAuth();

    useEffect(() => {
        if (!token) {
            setStatus("error");
            setMessage("That link is missing its token.");
            return;
        }
        async function verify(t: string) {
            try {
                await verifyEmail(t);
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
            {status === "verifying" && <p>Verifying…</p>}
            {status === "ok" && (
                <p>
                    Email verified successfully. <Link to="/">Go to home page</Link>.
                </p>
            )}
            {status === "error" && (
                <p>
                    {message} <Link to="/login">Go to login page</Link>.
                </p>
            )}
        </div>
    );
}