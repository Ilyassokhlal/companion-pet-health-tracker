import { apiFetch } from "./client";
import type { EventKind, HealthRecord, ScheduledEvent } from "../types";

// Payload for creating a new scheduled event that has no associated health record. Mirrors EventCreateRequest.
export interface EventCreate {
  pet_id: number;
  title: string;
  due_date: string;
  kind?: EventKind;
}

// Payload for updating an existing scheduled event. Only the title and due date can be changed. Mirrors EventUpdateRequest.
export type EventUpdate = Partial<Pick<ScheduledEvent, "title" | "due_date">>;

// Fetch a pet's scheduled events, soonest first. Completed events are left out unless includeDone is set.
export async function listEvents(petId: number, includeDone = false): Promise<ScheduledEvent[]> {
  return apiFetch<ScheduledEvent[]>(`/pets/${petId}/events?include_done=${includeDone}`);
}

// Schedule an appointment or check-in that does not generate a health record.
export async function createEvent(data: EventCreate): Promise<ScheduledEvent> {
  return apiFetch<ScheduledEvent>("/events", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Complete a scheduled event. The backend creates the health record associated with the event and returns it for further editing.
export async function completeEvent(eventId: number): Promise<HealthRecord> {
  return apiFetch<HealthRecord>(`/events/${eventId}/complete`, { method: "POST" });
}