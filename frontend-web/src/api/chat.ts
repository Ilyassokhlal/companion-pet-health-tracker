import { apiFetch, getToken } from "./client";
import type { ChatMessage, Citation } from "../types";

const BASE_URL = import.meta.env.VITE_API_URL;

// Represents an event emitted by the askStream function. It can be either a token event, which contains a piece of the answer, or a meta event, which contains sources and confidence.
export type AskEvent =
  | { type: "token"; value: string }
  | { type: "meta"; sources: Citation[]; confidence: string };


// Asks a question to the API and returns an async generator that yields events as they are received. If the response is JSON, it yields a single token event and a meta event. If the response is a stream, it yields token events as they are received.
export async function* askStream(petId: number, question: string): AsyncGenerator<AskEvent> {
    const response = await fetch(`${BASE_URL}/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${getToken()}`,
    },
    body: JSON.stringify({ pet_id: petId, question }),
  });
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.detail);
  }
  const contentType = response.headers.get("Content-Type");
    if (contentType && contentType.includes("application/json")) {
    const data = await response.json();
    yield { type: "token", value: data.answer };
    yield { type: "meta", sources: data.sources, confidence: data.confidence };
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
        yield { type: "meta", sources: data.meta.sources, confidence: data.meta.confidence };
      }
    }

    if (done) break;
  }
}

// Fetches chat messages for a specific pet, with optional pagination parameters. 
// The `limit` option controls how many messages are returned, and the `before` option is used to fetch messages older than a certain message ID.
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

// Deletes a specific chat message by its ID. This function sends a DELETE request to the API endpoint for the specified message.
export async function deleteMessage(messageId: number): Promise<void> {
  return apiFetch<void>(`/messages/${messageId}`, { method: "DELETE" });
}

// Deletes all chat messages for a specific pet. This function sends a DELETE request to the API endpoint for the specified pet's messages.
export async function clearMessages(petId: number): Promise<void> {
  return apiFetch<void>(`/pets/${petId}/messages`, { method: "DELETE" });
}