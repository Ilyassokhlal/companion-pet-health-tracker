import { useAuth } from "../auth/AuthContext";
import ChangeEmailForm from "../components/ChangeEmailForm";
import ReminderSettings from "../components/ReminderSettings";
import DeleteAccountForm from "../components/DeleteAccountForm";

export default function Settings() {
  const { user } = useAuth();
    if (!user)
      return null;
  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      <div className="grid gap-6 lg:grid-cols-2 items-start">
      <section className="p-6 bg-surface border border-border rounded-xl shadow-soft mb-6">
        <h2 className="text-lg font-semibold mb-4">Account</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-4"><dt className="text-muted">Username</dt><dd>{user.username}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-muted">Email</dt><dd>{user.email}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-muted">Member since</dt><dd>{new Date(user.created_at).toLocaleDateString()}</dd></div>
        </dl>
      </section>
      <ReminderSettings />
      <ChangeEmailForm />
      <DeleteAccountForm />
      </div>
    </div>
  );
}