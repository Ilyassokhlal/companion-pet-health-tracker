import { apiFetch } from "./client";

export type Plan = "monthly" | "yearly";

// Starts a Stripe checkout for the chosen plan and returns the Stripe page to send the user to.
export async function startCheckout(plan: Plan): Promise<string> {
  const data = await apiFetch<{ url: string }>("/billing/checkout", {
    method: "POST",
    body: JSON.stringify({ plan }),
  });
  return data.url;
}

// Opens Stripe's billing portal, where a web subscription is changed or cancelled. Returns its URL.
export async function openPortal(): Promise<string> {
  const data = await apiFetch<{ url: string }>("/billing/portal", { method: "POST" });
  return data.url;
}

// Moves a running web subscription paid with this account's email onto this account.
export async function restorePurchase(): Promise<void> {
  return apiFetch<void>("/billing/restore", { method: "POST" });
}