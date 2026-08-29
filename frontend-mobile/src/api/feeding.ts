import { apiFetch } from "./client";
import type { Feeding, FeedingTime, SlotStatus } from "../types";

export type FeedingCreate = {
  date: string;
  time: string;
  food?: string | null;
  amount?: number | null;
  amount_unit?: string | null;
  notes?: string | null;
};

// Represents the data required to create a new feeding entry for a pet.
export type FeedingUpdate = Partial<FeedingCreate>;

// Lists all feeding times for a pet.
export async function listFeedingTimes(petId: number): Promise<FeedingTime[]> {
  return apiFetch<FeedingTime[]>(`/pets/${petId}/feeding-times`);
}

// Creates a new feeding time for a pet. The `time` should be on a 15-minute boundary and must not duplicate an existing feeding time.
export async function createFeedingTime(petId: number, time: string): Promise<FeedingTime> {
  return apiFetch<FeedingTime>(`/pets/${petId}/feeding-times`, {
    method: "POST",
    body: JSON.stringify({ time }),
  });
}

// Deletes a feeding time by its ID.
export async function deleteFeedingTime(id: number): Promise<void> {
  return apiFetch<void>(`/feeding-times/${id}`, { method: "DELETE" });
}

// Lists all feeding entries for a pet. The optional `on` parameter filters feedings to a specific date.
export async function listFeedings(petId: number, on?: string): Promise<Feeding[]> {
  return apiFetch<Feeding[]>(`/pets/${petId}/feedings${on ? `?on=${on}` : ""}`);
}

// Creates a new feeding entry for a pet. The `feeding` object contains the details of the feeding.
export async function createFeeding(petId: number, feeding: FeedingCreate): Promise<Feeding> {
  return apiFetch<Feeding>(`/pets/${petId}/feedings`, {
    method: "POST",
    body: JSON.stringify(feeding),
  });
}

// Updates a feeding entry by its ID. Only the fields provided in the `feeding` object will be updated.
export async function updateFeeding(id: number, feeding: FeedingUpdate): Promise<Feeding> {
  return apiFetch<Feeding>(`/feedings/${id}`, {
    method: "PATCH",
    body: JSON.stringify(feeding),
  });
}

// Deletes a feeding entry by its ID.
export async function deleteFeeding(id: number): Promise<void> {
  return apiFetch<void>(`/feedings/${id}`, { method: "DELETE" });
}

// Fetches the current feeding status for a pet, including today's schedule and progress.
export async function feedingStatus(petId: number): Promise<SlotStatus[]> {
  return apiFetch<SlotStatus[]>(`/pets/${petId}/feeding-status`);
}