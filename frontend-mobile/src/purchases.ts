import { Platform } from "react-native";
import Purchases, { PACKAGE_TYPE } from "react-native-purchases";
import type { PurchasesPackage } from "react-native-purchases";

import { apiFetch } from "@/api/client";
import type { User } from "@/types";

// RevenueCat's public SDK key for the Play Store app. Public by design, so it lives in .env and .env.production.
const GOOGLE_KEY = process.env.EXPO_PUBLIC_REVENUECAT_GOOGLE_KEY;

// Store purchases only exist on Android for now. The iOS app will add Apple's key here.
export const storeAvailable = Platform.OS === "android" && !!GOOGLE_KEY;

export interface Plan {
  pkg: PurchasesPackage;
  period: "monthly" | "yearly";
  // Formatted by the store in the buyer's own currency, tax included
  price: string;
  amount: number;
}

// Ties RevenueCat to the signed-in account, so a purchase lands on it and the server's webhook finds it by id.
export async function identifyPurchaser(userId: number): Promise<void> {
  if (!storeAvailable) return;
  const appUserID = String(userId);
  if (await Purchases.isConfigured()) {
    await Purchases.logIn(appUserID);
  } else {
    Purchases.configure({ apiKey: GOOGLE_KEY as string, appUserID });
  }
}

// The monthly and yearly plans from Google Play, monthly first.
export async function loadPlans(): Promise<Plan[]> {
  const offerings = await Purchases.getOfferings();
  const plans: Plan[] = [];
  for (const pkg of offerings.current?.availablePackages ?? []) {
    const period = pkg.packageType === PACKAGE_TYPE.MONTHLY ? "monthly" : pkg.packageType === PACKAGE_TYPE.ANNUAL ? "yearly" : null;
    if (period) plans.push({ pkg, period, price: pkg.product.priceString, amount: pkg.product.price });
  }
  return plans.sort((a, b) => (a.period === b.period ? 0 : a.period === "monthly" ? -1 : 1));
}

// How much the yearly plan saves over twelve monthly payments, in whole percent, from the store's own prices.
export function yearlySaving(plans: Plan[]): number | null {
  const monthly = plans.find((plan) => plan.period === "monthly");
  const yearly = plans.find((plan) => plan.period === "yearly");
  if (!monthly || !yearly || monthly.amount <= 0) return null;
  return Math.round((1 - yearly.amount / (monthly.amount * 12)) * 100);
}

// Buys a plan through Google Play. Resolves to false when the buyer backs out, and throws when the store refuses.
export async function buy(plan: Plan): Promise<boolean> {
  try {
    await Purchases.purchasePackage(plan.pkg);
    return true;
  } catch (err) {
    if ((err as { code?: string }).code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) return false;
    throw err;
  }
}

// Restores purchases made with this phone's Google account onto the signed-in account.
export async function restoreStorePurchases(): Promise<void> {
  await Purchases.restorePurchases();
}

// Asks the server to re-read the account from RevenueCat, so premium shows at once instead of when the webhook arrives.
export function syncAccount(): Promise<User> {
  return apiFetch<User>("/billing/sync", { method: "POST" });
}
