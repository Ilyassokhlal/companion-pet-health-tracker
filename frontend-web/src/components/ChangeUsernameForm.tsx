import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { updateMe } from "../api/auth";
import Button from "./ui/Button";
import Input from "./ui/Input";

// Lets a signed-in user change their display name. Unlike email this needs no password confirmation
// and no re-verification — the username is not an identifier.
export default function ChangeUsernameForm() {
  const { user, refreshUser } = useAuth();
  const [username, setUsername] = useState(user?.username ?? "");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const trimmed = username.trim();
    if (!trimmed || trimmed === user?.username) {
      setSubmitting(false);
      return;
    }
    try {
      await updateMe({ username: trimmed });
      await refreshUser();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="username" className="block text-sm font-medium text-primary">
        Username
      </label>
      <Input
        id="username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        maxLength={36}
        required
        className="mt-1"
      />
      {error && <p className="text-sm text-danger mt-2">{error}</p>}
      <Button type="submit" disabled={submitting} className="mt-4">
        Change Username
      </Button>
    </form>
  );
}