import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import ChangeEmailForm from "../components/ChangeEmailForm";
import ChangePasswordForm from "../components/ChangePasswordForm";
import ReminderSettings from "../components/ReminderSettings";
import DeleteAccountForm from "../components/DeleteAccountForm";
import ChangeUsernameForm from "../components/ChangeUsernameForm";
import UserPhoto from "../components/UserPhoto";
import AppearanceSettings from "../components/AppearanceSettings";
import WeightSettings from "../components/WeightSettings";
import WalkSettings from "../components/WalkSettings";
import PreferencesSettings from "../components/PreferencesSettings";
import Button from "../components/ui/Button";
import { Pencil, X } from "lucide-react";
import { dateLocale } from "../dates";

type Panel = "username" | "email" | "password";

export default function Settings() {
  const { user } = useAuth();
  // One panel at a time — opening either closes the other.
  const [editing, setEditing] = useState<Panel | null>(null);

  if (!user) return null;

  const toggle = (panel: Panel) => setEditing(editing === panel ? null : panel);

  return (
    <div className="p-4 sm:p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>

      <section className="p-6 bg-surface border border-border rounded-xl shadow-soft mb-6">
        <h2 className="text-lg font-semibold mb-4">Account</h2>
        <div className="mb-6 flex justify-center">
          <UserPhoto />
        </div>
        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4 items-center">
            <dt className="text-muted shrink-0">Username</dt>
            <dd className="flex items-center gap-3 min-w-0">
              <span className="truncate">{user.username}</span>
              <Button
                variant={editing === "username" ? "secondary" : "primary"}
                onClick={() => toggle("username")}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 text-sm"
              >
                {editing === "username" ? <X size={14} /> : <Pencil size={14} />}
                {editing === "username" ? "Cancel" : "Update"}
              </Button>
            </dd>
          </div>
          <div className="flex justify-between gap-4 items-center">
            <dt className="text-muted shrink-0">Email</dt>
            <dd className="flex items-center gap-3 min-w-0">
              <span className="truncate">{user.email}</span>
              <Button
                variant={editing === "email" ? "secondary" : "primary"}
                onClick={() => toggle("email")}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 text-sm"
              >
                {editing === "email" ? <X size={14} /> : <Pencil size={14} />}
                {editing === "email" ? "Cancel" : "Update"}
              </Button>
            </dd>
          </div>
          <div className="flex justify-between gap-4 items-center">
            <dt className="text-muted shrink-0">Password</dt>
            <dd className="flex items-center gap-3">
              <span>••••••••</span>
              <Button
                variant={editing === "password" ? "secondary" : "primary"}
                onClick={() => toggle("password")}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1 text-sm"
              >
                {editing === "password" ? <X size={14} /> : <Pencil size={14} />}
                {editing === "password" ? "Cancel" : "Update"}
              </Button>
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-muted">Member since</dt>
            <dd>{new Date(user.created_at).toLocaleDateString(dateLocale())}</dd>
          </div>
        </dl>

        {editing === "username" && (
          <div className="mt-6 pt-6 border-t border-border">
            <ChangeUsernameForm />
          </div>
        )}
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

      <AppearanceSettings />
      <ReminderSettings />
      <WeightSettings />
      <WalkSettings />
      <PreferencesSettings />
      <DeleteAccountForm />
    </div>
  );
}