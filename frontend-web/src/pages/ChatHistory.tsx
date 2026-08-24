import { useState, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import { usePets } from "../context/PetContext";
import { listMessages, deleteMessage, clearMessages } from "../api/chat";
import type { ChatMessage } from "../types";
import Button from "../components/ui/Button";
import { Trash2 } from "lucide-react";
import ConfirmDialog from "../components/ui/ConfirmDialog";

// The ChatHistory component displays the chat history of the current pet. It uses the usePets hook to access the current pet and fetches its chat messages using the listMessages API function. The component allows deleting individual messages and clearing all messages. If there is no current pet, it prompts the user to add a pet first.
export default function ChatHistory() {
  const { currentPet } = usePets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
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

  const handleDelete = async () => {
    if (pendingDelete === null) return;
    await deleteMessage(pendingDelete);
    setPendingDelete(null);
    load();
  };

  const handleClear = async () => {
    if (!currentPet) return;
    setConfirmingClear(false);
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
    return <div className="p-8 text-muted">No conversations yet.</div>;
  }
  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-2xl font-bold mb-4">Chat History</h1>
      <Button variant="danger" onClick={() => setConfirmingClear(true)} className="mb-4 flex items-center gap-1.5">
        <Trash2 size={16} />Clear all
      </Button>
      <div className="space-y-4">
        {messages.map((m) => (
          <div key={m.id} className="bg-surface border border-border rounded-xl p-5 shadow-soft">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs uppercase tracking-wide text-muted">{m.role === "assistant" ? "Companion" : "You"}</span>
              <button
                onClick={() => setPendingDelete(m.id)}
                className="text-muted hover:text-danger transition"
                aria-label="Delete message"
              >
                <Trash2 size={14} />
              </button>
            </div>
            {m.role === "assistant" ? (
              <div className="prose-invert space-y-2 [&_ul]:list-disc [&_ul]:ps-5 [&_h2]:font-semibold [&_h3]:font-semibold">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            ) : (
              <p className="text-muted">{m.content}</p>
            )}
            {m.sources && m.sources.length > 0 && (
              <div className="mt-2">
                <h4 className="text-sm font-semibold text-muted">Sources</h4>
                <ul className="list-disc list-inside text-sm">
                  {m.sources.map((s, index) => (
                    <li key={index}>
                      <a
                        href={s.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {s.title} — {s.section}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
      <ConfirmDialog
        open={pendingDelete !== null}
        title="Delete message"
        message="This message will be permanently removed from the conversation."
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
      <ConfirmDialog
        open={confirmingClear}
        title="Clear conversation"
        message={`Every message for ${currentPet.name} will be permanently removed.`}
        confirmLabel="Clear all"
        onConfirm={handleClear}
        onCancel={() => setConfirmingClear(false)}
      />
    </div>
  );
}