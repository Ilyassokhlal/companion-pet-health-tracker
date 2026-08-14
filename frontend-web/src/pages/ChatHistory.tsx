import { useState, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { usePets } from "../context/PetContext";
import { listMessages, deleteMessage, clearMessages } from "../api/chat";
import type { ChatMessage } from "../types";

// The ChatHistory component displays the chat history of the current pet. It uses the usePets hook to access the current pet and fetches its chat messages using the listMessages API function. The component allows deleting individual messages and clearing all messages. If there is no current pet, it prompts the user to add a pet first.
export default function ChatHistory() {
  const { currentPet } = usePets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  // Load messages for the current pet
  const load = useCallback(() => {
    if (!currentPet) {
      setMessages([]);
      return;
    }
    setLoading(true);
    listMessages(currentPet.id)
      .then(setMessages)
      .finally(() => setLoading(false));
  }, [currentPet]);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this message?")) return;
    await deleteMessage(id);
    load();
  };

  const handleClear = async () => {
    if (!currentPet) return;
    if (!confirm("Are you sure you want to clear all messages?")) return;
    await clearMessages(currentPet.id);
    load();
  };
  
  // If there is no current pet, prompt the user to add a pet first
  if (!currentPet) {
    return <div className="p-8">Add a pet first.</div>;
  }

  // Display loading state, no messages state, or the list of messages
  if (loading) {
    return <div className="p-8">Loading…</div>;
  }
  if (messages.length === 0) {
    return <div className="p-8">No conversations yet.</div>;
  }
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Chat History</h1>
      <button
        onClick={handleClear}
        className="mb-4 px-4 py-2 bg-red-500 text-white rounded"
      >
        Clear All
      </button>
      <div className="space-y-4">
        {messages.map((m) => (
          <div key={m.id} className="border p-4 rounded">
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold">{m.role}</span>
              <button
                onClick={() => handleDelete(m.id)}
                className="text-red-500 hover:underline"
              >
                Delete
              </button>
            </div>
            {m.role === "assistant" ? (
              <ReactMarkdown>{m.content}</ReactMarkdown>
            ) : (
              <p>{m.content}</p>
            )}
            {m.sources && m.sources.length > 0 && (
              <div className="mt-2">
                <h4 className="font-semibold">Sources:</h4>
                <ul className="list-disc list-inside">
                  {m.sources.map((s, index) => (
                    <li key={index}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {s.title} - {s.section}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}