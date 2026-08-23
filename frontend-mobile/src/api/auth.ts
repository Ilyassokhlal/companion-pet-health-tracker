import { apiFetch, setToken } from "./client";
import type { TokenResponse, User } from "../types";
import { withCache } from "@/cache";
import type { PhotoUpload } from "./records";

// Registers a new user by sending their username, email, and password to the API. If successful, it stores the returned token in secure device storage.
export async function register(username: string, email: string, password: string): Promise<TokenResponse> {
  const data = await apiFetch<TokenResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      username,
      email,
      password,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, // Automatically set the timezone based on the user's browser
    }),
  });
  
  await setToken(data.access_token);
  return data;
}

// Logs in the user by sending their email and password to the API. If successful, it stores the returned token in secure device storage.
export async function login(email: string, password: string): Promise<TokenResponse> {
  const data = await apiFetch<TokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });

  await setToken(data.access_token);
  return data;
}

// Fetches the current user's information from the API. If the token is invalid or expired, it will clear the token from secure device storage.
export async function me(): Promise<User> {
  return apiFetch<User>("/auth/me");
}

// Logs out the user by clearing the token from secure device storage.
export async function logout(): Promise<void> {
  await setToken(null);
}

// Verifies the user's email by sending the verification token to the API. If successful, it returns the updated user information.
export async function verifyEmail(token: string): Promise<User> {
  return apiFetch<User>("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify({ token }),
  });
}

// Resends the verification email to the currently logged-in user.
export async function resendVerification(): Promise<void> {
  return apiFetch<void>("/auth/resend-verification", { method: "POST" });
}

// Initiates the password reset process by sending the user's email to the API. The API will send a reset link to the user's email if it exists.
export async function forgotPassword(email: string): Promise<void> {
  return apiFetch<void>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

// Resets the user's password by sending the reset token and new password to the API. If successful, it does not return any data.
export async function resetPassword(token: string, newPassword: string): Promise<void> {
  return apiFetch<void>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, new_password: newPassword }),
  });
}

// Changes the user's email by sending the new email and current password to the API. If successful, it returns the updated user information.
export async function changeEmail(email: string, password: string): Promise<User> {
  return apiFetch<User>("/auth/change-email", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

// Deletes the user's account by sending the current password to the API. If successful, it does not return any data.
export async function deleteAccount(password: string): Promise<void> {
  return apiFetch<void>("/auth/me", {
    method: "DELETE",
    body: JSON.stringify({ password }),
  });
}

// Updates the user's account settings, such as email preferences, by sending the updated data to the API. If successful, it returns the updated user information.
export async function updateMe(data: { reminders_enabled?: boolean; timezone?: string; username?: string }): Promise<User> {
  return apiFetch<User>("/auth/me", {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// The signed-in user, falling back to the last cached copy when offline.
export async function meCached() {
  return withCache("me", () => me());
}

// Changes the signed-in user's password. The API returns a fresh token because the
// change invalidates every existing one, including this session's.
export async function changePassword(currentPassword: string, newPassword: string): Promise<TokenResponse> {
  const data = await apiFetch<TokenResponse>("/auth/change-password", {
    method: "POST",
    body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
  });
  await setToken(data.access_token);
  return data;
}

// Uploads an avatar for the signed-in user. Returns the updated user.
export async function uploadMyPhoto(file: PhotoUpload): Promise<User> {
  const form = new FormData();
  form.append("file", file as unknown as Blob);
  return apiFetch<User>("/auth/me/photo", { method: "POST", body: form });
}

// Removes the signed-in user's avatar. Returns the updated user.
export async function deleteMyPhoto(): Promise<User> {
  return apiFetch<User>("/auth/me/photo", { method: "DELETE" });
}
