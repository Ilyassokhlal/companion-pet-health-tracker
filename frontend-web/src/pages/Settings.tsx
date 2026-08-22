import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import ChangeEmailForm from "../components/ChangeEmailForm";
import ChangePasswordForm from "../components/ChangePasswordForm";
import ReminderSettings from "../components/ReminderSettings";
import DeleteAccountForm from "../components/DeleteAccountForm";

export default function Settings() {
  const { user } = useAuth();
  // One panel at a time — opening either closes the other.
  const [editing, setEditing] = useState<"email" | "password" | null>(null);

  if (!user) return null;

  const toggle = (panel: "email" | "password") => setEditing(editing === panel ? null : panel);

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <section className="p-6 bg-surface border border-border rounded-xl shadow-soft mb-6">
        <h2 className="text-lg font-semibold mb-4">Account</h2>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Username</dt>
            <dd>{user.username}</dd>
          </div>
          <div className="flex justify-between gap-4 items-center">
            <dt className="text-muted shrink-0">Email</dt>
            <dd className="flex items-center gap-3 min-w-0">
              <span className="truncate">{user.email}</span>
              <button onClick={() => toggle("email")} className="shrink-0 text-primary hover:underline">
                {editing === "email" ? "Cancel" : "Update"}
              </button>
            </dd>
          </div>
          <div className="flex justify-between gap-4 items-center">
            <dt className="text-muted shrink-0">Password</dt>
            <dd className="flex items-center gap-3">
              <span>••••••••</span>
              <button onClick={() => toggle("password")} className="shrink-0 text-primary hover:underline">
                {editing === "password" ? "Cancel" : "Update"}
              </button>
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Member since</dt>
            <dd>{new Date(user.created_at).toLocaleDateString()}</dd>
          </div>
        </dl>

        {editing === "email" && (
          <div className="mt-6 pt-6 border-t border-border">
            <ChangeEmailForm />
          </div>
        )}
        {editing === "password" && (
          <div className="mt-6 pt-6 border-t border-border">
            <ChangePasswordForm />
          </div>
        )}
      </section>

      <ReminderSettings />
      <DeleteAccountForm />
    </div>
  );
}