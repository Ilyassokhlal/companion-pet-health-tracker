import { apiFetch } from "./client";

// Registers this install's Expo push token with the backend, or moves it to the signed-in user
// if the device was last registered to a different account.
export async function registerDevice(token: string, platform: string): Promise<void> {
  await apiFetch<void>("/devices", { method: "POST", body: JSON.stringify({ token, platform }) });
}

// Drops this install's token. Called on logout, so the phone stops receiving the previous user's reminders.
export async function unregisterDevice(token: string, platform: string): Promise<void> {
  await apiFetch<void>("/devices", { method: "DELETE", body: JSON.stringify({ token, platform }) });
}