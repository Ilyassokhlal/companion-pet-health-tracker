import { apiFetch } from "./client";
import type { Walk } from "../types";

// The shape of the data required to create a new walk. This includes the date, duration, optional distance, and optional notes.
export type WalkCreate = {
  date: string;
  duration_minutes: number;
  distance_km?: number | null;
  notes?: string | null;
};

export type WalkUpdate = Partial<WalkCreate>;

// Fetch the list of walks for a given pet. Returns an array of walks in newest-first order.
export async function listWalks(petId: number): Promise<Walk[]> {
  return apiFetch<Walk[]>(`/pets/${petId}/walks`);
}

// Create a new walk for a given pet. Returns the created walk.
export async function createWalk(petId: number, walk: WalkCreate): Promise<Walk> {
  return apiFetch<Walk>(`/pets/${petId}/walks`, {
    method: "POST",
    body: JSON.stringify(walk),
  });
}

// Update an existing walk by its ID. Returns the updated walk.
export async function updateWalk(walkId: number, walk: WalkUpdate): Promise<Walk> {
  return apiFetch<Walk>(`/walks/${walkId}`, {
    method: "PATCH",
    body: JSON.stringify(walk),
  });
}

// Delete a walk by its ID. Returns nothing.
export async function deleteWalk(walkId: number): Promise<void> {
  return apiFetch<void>(`/walks/${walkId}`, { method: "DELETE" });
}