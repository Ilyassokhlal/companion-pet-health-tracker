export const BASE_URL = import.meta.env.VITE_API_URL;

// Fired on window when the server refuses a change because the account is locked, so the app can open the subscribe screen.
export const SUBSCRIPTION_REQUIRED = "companion:subscription-required";

// Fired on window when the server says the account is suspended, so a live session signs out at once and the login screen can say why.
export const ACCOUNT_SUSPENDED = "companion:account-suspended";

// A function to get the token from localStorage. Returns null if no token is found.
export function getToken(): string | null {
  return localStorage.getItem("token") || null;
}


// Sets the token in localStorage. If the token is null, it removes the token from localStorage.
export function setToken(token: string | null): void {
  if (token) {
    localStorage.setItem("token", token);
  } else {
    localStorage.removeItem("token");
  }
}

// A custom error class for API errors, including the error code, parameters, and HTTP status. When an API request fails, an instance of this class is thrown.
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
export async function failure(response: Response): Promise<ApiError> {
  const errorData = await response.json().catch(() => null);
  const detail = errorData?.detail;
  const message = Array.isArray(detail)
    ? detail.map((d: { msg: string }) => d.msg).join(", ")
    : detail ||
      (response.status === 429
        ? "Too many attempts. Wait a while and try again."
        : `Request failed (${response.status})`);
  // A 422 comes from Pydantic and a 429 from slowapi — neither carries one of our codes, so they get
  // synthetic ones and the UI always has something to look up.
  const code =
    errorData?.code ||
    (response.status === 429 ? "too_many_attempts" : Array.isArray(detail) ? "validation" : "generic");
  if (code === "subscription_required") {
    window.dispatchEvent(new Event(SUBSCRIPTION_REQUIRED));
  }
  // Only a signed-in session is signed out. A refused login or signup just shows the message where it happened.
  if (code === "account_suspended" && getToken()) {
    setToken(null);
    window.dispatchEvent(new Event(ACCOUNT_SUSPENDED));
  }
  return new ApiError(message, code, errorData?.params ?? {}, response.status);
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