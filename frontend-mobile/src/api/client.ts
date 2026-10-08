import * as SecureStore from "expo-secure-store";
import { DeviceEventEmitter, Platform } from "react-native";

export const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

const TOKEN_KEY = "token";

// Emitted when the server refuses a change because the account is locked, so the app can open the subscribe screen.
export const SUBSCRIPTION_REQUIRED = "companion:subscription-required";

// Emitted when the server says the account is suspended, so a live session signs out at once and the login screen can say why.
export const ACCOUNT_SUSPENDED = "companion:account-suspended";

// Names this app (android or ios) on every signed-in request, so the admin dashboard can count each day's actives by app
export const CLIENT_HEADER = { "X-Client": Platform.OS };

// Reads the auth token from secure device storage. Returns null if none is stored.
export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}


// Stores the auth token in secure device storage, or deletes it when passed null.
export async function setToken(token: string | null): Promise<void> {
  if (token) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  } else {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }
}

// Represents an error returned by the API, including a machine-readable code, optional parameters, and the HTTP status. This allows the UI to handle errors consistently and display appropriate messages to the user.
export class ApiError extends Error {
  code: string;
  params: Record<string, unknown>;
  status: number;

  constructor(message: string, code: string, params: Record<string, unknown>, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.params = params;
    this.status = status;
  }
}

// Turns a failed response into an ApiError. Shared by apiFetch and the streaming chat, so both report errors the same way.
export async function failure(response: { status: number; json: () => Promise<unknown> }): Promise<ApiError> {
  const errorData = (await response.json().catch(() => null)) as { detail?: unknown; code?: string; params?: Record<string, unknown> } | null;
  const detail = errorData?.detail;
  const message = Array.isArray(detail)
    ? detail.map((d: { msg: string }) => d.msg).join(", ")
    : (detail as string | undefined) ||
      (response.status === 429
        ? "Too many attempts. Wait a while and try again."
        : `Request failed (${response.status})`);
  // Determine the machine-readable error code to use. If the server provides one, use it. Otherwise, generate a synthetic one based on the response status and detail. This ensures the UI always has something to look up.
  const code =
    errorData?.code ||
    (response.status === 429 ? "too_many_attempts" : Array.isArray(detail) ? "validation" : "generic");
  if (code === "subscription_required") {
    DeviceEventEmitter.emit(SUBSCRIPTION_REQUIRED);
  }
  // Only a signed-in session is signed out. A refused login or signup just shows the message where it happened.
  // The token goes first, so the sign out that follows can't be refused for the same reason again.
  if (code === "account_suspended" && (await getToken())) {
    await setToken(null);
    DeviceEventEmitter.emit(ACCOUNT_SUSPENDED);
  }
  return new ApiError(message, code, errorData?.params ?? {}, response.status);
}

// A function that wraps the fetch API to include the Authorization header if a token is present, and handles 401 responses by clearing the token.
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...CLIENT_HEADER };
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const token = await getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });
  if (response.status === 401) {
    setToken(null);
  }
  if (!response.ok) {
    throw await failure(response);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

// Adds the options that are set to a path as its query string. A list repeats its key, which is how the server reads a list.
export function withQuery(path: string, params: Record<string, string | number | string[] | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) value.forEach((item) => query.append(key, item));
    else query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `${path}?${text}` : path;
}
