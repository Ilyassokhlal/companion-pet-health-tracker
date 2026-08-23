import { useCallback, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";

import Input from "@/components/ui/Input";
import { usePets } from "@/context/PetContext";
import * as WebBrowser from "expo-web-browser";
import { askStream, listMessages, deleteMessage, clearMessages } from "@/api/chat";
import type { Citation } from "@/types";
import Markdown from "react-native-markdown-display";
import SwipeTabs from "@/components/SwipeTabs";

const markdownStyles = {
  body: { color: "#ece9f5" },
  strong: { color: "#ece9f5", fontWeight: "700" as const },
  em: { color: "#ece9f5" },
  heading1: { color: "#ece9f5", fontSize: 18, fontWeight: "700" as const, marginBottom: 4 },
  heading2: { color: "#ece9f5", fontSize: 16, fontWeight: "600" as const, marginBottom: 4 },
  heading3: { color: "#ece9f5", fontSize: 15, fontWeight: "600" as const, marginBottom: 4 },
  bullet_list: { marginVertical: 4 },
  ordered_list: { marginVertical: 4 },
  link: { color: "#7c3aed" },
  code_inline: { backgroundColor: "#0b0a0f", color: "#ece9f5" },
};

interface Turn {
  id?: number;
  role: "user" | "assistant";
  content: string;
  sources?: Citation[];
}

export default function Chat() {
  const { currentPet } = usePets();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView>(null);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const [streaming, setStreaming] = useState(false);

  const load = useCallback(async () => {
    if (!currentPet) {
      setTurns([]);
      return;
    }
    try {
      const messages = await listMessages(currentPet.id);
      setTurns(
        messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          sources: m.sources ?? undefined,
        })),
      );
    } catch (err) {
      console.error(err);
    }
  }, [currentPet]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function updateLast(change: (turn: Turn) => Turn) {
    setTurns((prev) => {
      const next = [...prev];
      next[next.length - 1] = change(next[next.length - 1]);
      return next;
    });
  }

  async function handleAsk() {
    if (!currentPet || !question.trim() || streaming) return;

    const asked = question;
    setTurns((prev) => [
      ...prev,
      { role: "user", content: asked },
      { role: "assistant", content: "" },
    ]);
    setQuestion("");
    setStreaming(true);

    try {
      for await (const event of askStream(currentPet.id, asked)) {
        if (event.type === "token") {
          updateLast((t) => ({ ...t, content: t.content + event.value }));
        } else if (event.type === "meta") {
          updateLast((t) => ({ ...t, sources: event.sources }));
        }
      }
    } catch (err) {
      updateLast((t) => ({
        ...t,
        content: `${t.content}\n\nError: ${(err as Error).message}`,
      }));
    } finally {
      setStreaming(false);
    }
  }

  function confirmDeleteTurn(turn: Turn) {
    if (turn.id === undefined) return;
    const id = turn.id;
    Alert.alert("Delete message", "This message will be permanently removed.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteMessage(id);
          load();
        },
      },
    ]);
  }

  function confirmClear() {
    if (!currentPet) return;
    const petId = currentPet.id;
    Alert.alert("Clear chat", "Every message for this pet will be permanently removed.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          await clearMessages(petId);
          load();
        },
      },
    ]);
  }

  if (!currentPet) {
    return (
      <View className="flex-1 items-center justify-center bg-ink px-6">
        <Text className="text-center text-muted">Add a pet first.</Text>
      </View>
    );
  }

  return (
    <SwipeTabs>
    <KeyboardAvoidingView
      behavior="padding"
      className="flex-1 bg-ink"
    >
      <View
        className="flex-row items-center justify-between border-b border-border px-4 pb-3"
        style={{ paddingTop: insets.top + 12 }}
      >
        <Text numberOfLines={1} className="flex-1 text-lg font-semibold text-fg">
          Ask about {currentPet.name}
        </Text>
        {turns.length > 0 ? (
          <Pressable
            onPress={confirmClear}
            className="ml-3 shrink-0 rounded-full border border-danger bg-surface px-3 py-1.5 active:opacity-70"
          >
            <Text className="text-sm font-medium text-danger">Clear</Text>
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        ref={scrollRef}
        className="flex-1"
        contentContainerStyle={{ padding: 16, gap: 12 }}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {turns.length === 0 ? (
          <Text className="text-muted">
            Ask anything about {currentPet.name} — vaccinations, symptoms, medications.
          </Text>
        ) : null}

        {turns.map((t, idx) => (
          <Pressable
            key={idx}
            onLongPress={() => confirmDeleteTurn(t)}
            className={`max-w-[85%] rounded-xl px-3 py-2 ${
              t.role === "user" ? "self-end bg-primary" : "self-start border border-border bg-surface"
            }`}
          >
            {t.role === "assistant" && !t.content ? (
              <Text className="text-muted">Thinking…</Text>
            ) : t.role === "assistant" ? (
              <Markdown style={markdownStyles}>{t.content}</Markdown>
            ) : (
              <Text className="text-fg">{t.content}</Text>
            )}

            {t.sources && t.sources.length > 0 ? (
              <View className="mt-2 flex-row flex-wrap items-baseline">
                <Text className="text-xs text-muted">Sources: </Text>
                {t.sources.map((s, i) => (
                  <Pressable key={i} onPress={() => WebBrowser.openBrowserAsync(s.url)}>
                    <Text className="text-xs text-primary">
                      {i > 0 ? ", " : ""}
                      {s.title}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </Pressable>
        ))}
      </ScrollView>

      <View className="flex-row gap-2 border-t border-border p-4">
        <Input
          value={question}
          onChangeText={setQuestion}
          placeholder="Ask a question…"
          className="flex-1 rounded-lg border border-border bg-ink px-4 py-3 text-fg"
          onSubmitEditing={handleAsk}
          returnKeyType="send"
          editable={!streaming}
        />
        <Pressable
          onPress={handleAsk}
          disabled={streaming}
          className={`justify-center rounded-lg px-5 ${streaming ? "bg-surface" : "bg-primary"}`}
        >
          <Text className="font-semibold text-fg">Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
    </SwipeTabs>
  );
}