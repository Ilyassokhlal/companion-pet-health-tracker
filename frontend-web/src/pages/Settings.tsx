import { useAuth } from "../auth/AuthContext";
import ChangeEmailForm from "../components/ChangeEmailForm";
import ReminderSettings from "../components/ReminderSettings";
import DeleteAccountForm from "../components/DeleteAccountForm";

export default function Settings() {
  const { user } = useAuth();
    if (!user)
      return null;
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Account</h2>
        <p>Username: {user.username}</p>
        <p>Email: {user.email}</p>
        <p>Member since: {new Date(user.created_at).toLocaleDateString()}</p>
      </section>
      <ReminderSettings />
      <ChangeEmailForm />
      <DeleteAccountForm />
    </div>
  );
}