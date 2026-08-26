import { apiFetch } from "./client";
import type { EventKind, HealthRecord, ScheduledEvent } from "../types";

// Payload for scheduling something that has no health record behind it. Mirrors EventCreateRequest.
export interface EventCreate {
  pet_id: number;
  title: string;
  due_date: string;
  kind?: EventKind;
}

// The fields a scheduled event allows changing. Mirrors EventUpdateRequest.
export type EventUpdate = Partial<Pick<ScheduledEvent, "title" | "due_date" | "muted_until">>;

// Fetch a pet's scheduled events, soonest first. Completed events are left out unless includeDone is set.
export async function listEvents(petId: number, includeDone = false): Promise<ScheduledEvent[]> {
  return apiFetch<ScheduledEvent[]>(`/pets/${petId}/events?include_done=${includeDone}`);
}

// Schedule an appointment or check-in that no health record generated.
export async function createEvent(data: EventCreate): Promise<ScheduledEvent> {
  return apiFetch<ScheduledEvent>("/events", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Update a scheduled event's title or due date.
export async function updateEvent(eventId: number, data: EventUpdate): Promise<ScheduledEvent> {
  return apiFetch<ScheduledEvent>(`/events/${eventId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// Remove a scheduled event.
export async function deleteEvent(eventId: number): Promise<void> {
  return apiFetch<void>(`/events/${eventId}`, { method: "DELETE" });
}

// Mark an event done. The backend creates the health record it produced and returns that record for editing.
export async function completeEvent(eventId: number): Promise<HealthRecord> {
  return apiFetch<HealthRecord>(`/events/${eventId}/complete`, { method: "POST" });
}