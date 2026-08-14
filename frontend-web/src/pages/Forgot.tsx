import { useState } from "react";
import { Link } from "react-router-dom";
import { forgotPassword } from "../api/auth";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";

// Forgot password page component. Allows the user to enter their email to receive a password reset link.
export default function Forgot() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await forgotPassword(email);
    setSent(true);
    setSubmitting(false);
  }

    return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-8 bg-surface border border-border rounded-lg">
        <h1 className="text-2xl font-bold mb-6">Forgot Password</h1>
        {sent ? (
          <p className="text-muted">
            If that address is registered, we've sent a link to reset your password.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-muted mb-2" htmlFor="email">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>
        )}
        <p className="mt-4">
          <Link to="/login" className="text-primary hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
