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

// A function that wraps the fetch API to include the Authorization header if a token is present, and handles 401 responses by clearing the token.
export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {};
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const token = getToken();
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
    const errorData = await response.json().catch(() => null);
    const detail = errorData?.detail;
    const message = Array.isArray(detail)
      ? detail.map((d: { msg: string }) => d.msg).join(", ")
      : detail ||
        (response.status === 429
          ? "Too many attempts. Wait a while and try again."
          : `Request failed (${response.status})`);
    // Determine the machine-readable error code to use. If the server provides one, use it. Otherwise, generate a synthetic one based on the response status and detail. This ensures the UI always has something to look up.
    const code =
      errorData?.code ||
      (response.status === 429 ? "too_many_attempts" : Array.isArray(detail) ? "validation" : "generic");
    throw new ApiError(message, code, errorData?.params ?? {}, response.status);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}