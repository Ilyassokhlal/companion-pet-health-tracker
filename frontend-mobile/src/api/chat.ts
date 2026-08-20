import { fetch as streamingFetch } from "expo/fetch";

import { apiFetch, getToken } from "./client";
import type { ChatMessage, Citation } from "@/types";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

// An event emitted by askStream: either a piece of the answer, or the trailing
// metadata carrying sources and confidence.
export type AskEvent =
  | { type: "token"; value: string }
  | { type: "meta"; sources: Citation[]; confidence: string };

export async function* askStream(petId: number, question: string): AsyncGenerator<AskEvent> {
  const token = await getToken();

  const response = await streamingFetch(`${BASE_URL}/ask`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
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

export async function listMessages(petId: number): Promise<ChatMessage[]> {
  return apiFetch<ChatMessage[]>(`/pets/${petId}/messages`);
}

export async function deleteMessage(messageId: number): Promise<void> {
  return apiFetch<void>(`/messages/${messageId}`, { method: "DELETE" });
}

export async function clearMessages(petId: number): Promise<void> {
  return apiFetch<void>(`/pets/${petId}/messages`, { method: "DELETE" });
}