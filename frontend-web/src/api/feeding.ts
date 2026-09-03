import { apiFetch } from "./client";
import type { Feeding, FeedingTime, SlotStatus } from "../types";

// Types and functions for managing pet feedings via the API.
export type FeedingCreate = {
  date: string;
  time: string;
  food?: string | null;
  amount?: number | null;
  amount_unit?: string | null;
  notes?: string | null;
};

// List all feeding times for a given pet.
export async function listFeedingTimes(petId: number): Promise<FeedingTime[]> {
  return apiFetch<FeedingTime[]>(`/pets/${petId}/feeding-times`);
}

// Create a new feeding time for a pet. The server refuses a duplicate time and anything off a 15-minute boundary.
export async function createFeedingTime(petId: number, time: string): Promise<FeedingTime> {
  return apiFetch<FeedingTime>(`/pets/${petId}/feeding-times`, {
    method: "POST",
    body: JSON.stringify({ time }),
  });
}

// Delete a feeding time by its ID.
export async function deleteFeedingTime(id: number): Promise<void> {
  return apiFetch<void>(`/feeding-times/${id}`, { method: "DELETE" });
}

// List all feedings for a pet. The `on` parameter narrows to a single day; omit it for the whole log, newest first.
export async function listFeedings(petId: number, on?: string): Promise<Feeding[]> {
  return apiFetch<Feeding[]>(`/pets/${petId}/feedings${on ? `?on=${on}` : ""}`);
}

// Create a new feeding record for a pet.
export async function createFeeding(petId: number, feeding: FeedingCreate): Promise<Feeding> {
  return apiFetch<Feeding>(`/pets/${petId}/feedings`, {
    method: "POST",
    body: JSON.stringify(feeding),
  });
}

// Delete a feeding record by its ID.
export async function deleteFeeding(id: number): Promise<void> {
  return apiFetch<void>(`/feedings/${id}`, { method: "DELETE" });
}

// Get the current feeding status for a pet, including which slots are filled and which are available.
export async function feedingStatus(petId: number): Promise<SlotStatus[]> {
  return apiFetch<SlotStatus[]>(`/pets/${petId}/feeding-status`);
}