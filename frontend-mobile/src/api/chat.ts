import { fetch as streamingFetch } from "expo/fetch";

import { apiFetch, CLIENT_HEADER, failure, getToken } from "./client";
import type { ChatMessage, Citation } from "@/types";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

// An event emitted by askStream: either a piece of the answer, or the trailing
// metadata carrying sources and confidence.
export type AskEvent =
  | { type: "token"; value: string }
  | { type: "meta"; sources: Citation[]; confidence: string; messageId: number | null };

export async function* askStream(petId: number, question: string): AsyncGenerator<AskEvent> {
  const token = await getToken();

  const response = await streamingFetch(`${BASE_URL}/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...CLIENT_HEADER,
    },
    body: JSON.stringify({ pet_id: petId, question }),
  });

  if (!response.ok) {
    throw await failure(response);
  }

  const contentType = response.headers.get("Content-Type");
  if (contentType && contentType.includes("application/json")) {
    const data = await response.json();
    yield { type: "token", value: data.answer };
    yield { type: "meta", sources: data.sources, confidence: data.confidence, messageId: data.message_id ?? null };
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Failed to read response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    buffer += done ? "" : decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = done ? "" : (lines.pop() ?? "");

    for (const line of lines) {
      if (!line.trim()) continue;
      const data = JSON.parse(line);
      if (data.token !== undefined) {
        yield { type: "token", value: data.token };
      } else if (data.meta) {
        yield { type: "meta", sources: data.meta.sources, confidence: data.meta.confidence, messageId: data.meta.message_id ?? null };
      }
    }

    if (done) break;
  }
}

// Fetch a list of chat messages for a given pet, with optional pagination.
export async function listMessages(
  petId: number,
  options: { limit?: number; before?: number } = {},
): Promise<ChatMessage[]> {
  const query = new URLSearchParams();
  if (options.limit !== undefined) query.set("limit", String(options.limit));
  if (options.before !== undefined) query.set("before", String(options.before));
  const suffix = query.toString() ? `?${query}` : "";
  return apiFetch<ChatMessage[]>(`/pets/${petId}/messages${suffix}`);
}

// The reasons a user can give when reporting an answer, in the order the report form lists them.
export const REPORT_REASONS = ["wrong_or_unsafe", "offensive", "off_topic", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

// Report an AI answer, with an optional note. Reporting the same answer again changes nothing.
export async function reportMessage(messageId: number, reason: ReportReason, note: string): Promise<void> {
  return apiFetch<void>(`/messages/${messageId}/report`, {
    method: "POST",
    body: JSON.stringify({ reason, note: note.trim() || null }),
  });
}

// Delete a specific chat message by its ID.
export async function deleteMessage(messageId: number): Promise<void> {
  return apiFetch<void>(`/messages/${messageId}`, { method: "DELETE" });
}

// Clear all chat messages for a given pet.
export async function clearMessages(petId: number): Promise<void> {
  return apiFetch<void>(`/pets/${petId}/messages`, { method: "DELETE" });
}