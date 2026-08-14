import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";


// The Register component provides a user registration form. It manages the state for username, email, password, error messages, and submission status. Upon form submission, it calls the register function from the authentication context and navigates to the dashboard on success or displays an error message on failure.
export default function Register() {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setError(null);
      setSubmitting(true);
      try {
        await register(username, email, password);
        navigate("/", { replace: true });
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setSubmitting(false);
      }
    }
  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 p-8 bg-surface border border-border rounded-lg">
        <h1 className="text-2xl font-bold text-center">Register</h1>
        <Input
          type="text"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
          placeholder="Username"
          autoComplete="username"
        />
        <Input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          required
          placeholder="Email"
          autoComplete="email"
        />
        <Input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          placeholder="Password"
          autoComplete="new-password"
        />
        {error && <p className="text-danger text-sm">{error}</p>}
        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Registering..." : "Register"}
        </Button>
        <Link to="/login" className="text-primary hover:underline text-sm block">
          Already have an account? Login here
        </Link>
      </form>
    </div>
  );
}
