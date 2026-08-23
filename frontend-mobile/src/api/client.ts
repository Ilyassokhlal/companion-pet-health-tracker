import * as SecureStore from "expo-secure-store";

export const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

const TOKEN_KEY = "token";

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

// A function that wraps the fetch API to include the Authorization header if a token is present, and handles 401 responses by clearing the token.
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {};
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
    await setToken(null);
  }
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const detail = errorData?.detail;
    const message = Array.isArray(detail)
      ? detail.map((d: { msg: string }) => d.msg).join(", ")
      : detail ||
        (response.status === 429
          ? "Too many attempts. Wait a while and try again."
          : `Request failed (${response.status})`);
    throw new Error(message);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}