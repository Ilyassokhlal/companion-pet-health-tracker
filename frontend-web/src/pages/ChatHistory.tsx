import { useState, useEffect, useCallback, useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import { usePets } from "../context/PetContext";
import { listMessages, deleteMessage, clearMessages } from "../api/chat";
import type { ChatMessage } from "../types";
import Button from "../components/ui/Button";
import { Trash2 } from "lucide-react";
import ConfirmDialog from "../components/ui/ConfirmDialog";

// The page opens on the newest exchange, so it only fetches the tail of the conversation.
// Older messages arrive in larger chunks, since by then the user is deliberately reading back.
const INITIAL = 10;
const PAGE = 20;

// The ChatHistory component displays the chat history of the current pet. It uses the usePets hook to access the current pet and fetches its chat messages using the listMessages API function. The component allows deleting individual messages and clearing all messages. If there is no current pet, it prompts the user to add a pet first.
export default function ChatHistory() {
  const { t } = useTranslation();
  const { currentPet } = usePets();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<number | null>(null);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [loading, setLoading] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  // Set immediately after a fresh load so the layout effect knows to jump to the newest message.
  const jumpToEnd = useRef(false);
  // Page height captured before older messages are prepended, so the view can be held in place.
  const heightBeforePrepend = useRef<number | null>(null);

  // Load the newest slice of the conversation for the current pet
  const load = useCallback(() => {
    if (!currentPet) {
      setMessages([]);
      setHasMore(false);
      return;
    }
    setLoading(true);
    listMessages(currentPet.id, { limit: INITIAL })
      .then((rows) => {
        setMessages(rows);
        setHasMore(rows.length === INITIAL);
        jumpToEnd.current = true;
      })
      .finally(() => setLoading(false));
  }, [currentPet]);

  useEffect(() => {
    load();
  }, [load]);

  // Two different scroll behaviours, and they must not fight each other: a fresh load lands on the
  // newest message, while prepending older ones has to leave the reader exactly where they were.
  // Prepending grows the page upward, so without this the view would jump backwards in time.
  useLayoutEffect(() => {
    if (jumpToEnd.current) {
      jumpToEnd.current = false;
      endRef.current?.scrollIntoView({ block: "end" });
      return;
    }
    if (heightBeforePrepend.current !== null) {
      window.scrollBy(0, document.documentElement.scrollHeight - heightBeforePrepend.current);
      heightBeforePrepend.current = null;
    }
  }, [messages]);

  async function loadOlder() {
    if (!currentPet || messages.length === 0) return;
    setLoadingOlder(true);
    heightBeforePrepend.current = document.documentElement.scrollHeight;
    try {
      const older = await listMessages(currentPet.id, { limit: PAGE, before: messages[0].id });
      setMessages((prev) => [...older, ...prev]);
      setHasMore(older.length === PAGE);
    } finally {
      setLoadingOlder(false);
    }
  }

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
    return <div className="p-8">{t("common.noPet")}</div>;
  }

  // Display loading state, no messages state, or the list of messages
  if (loading) {
    return <div className="p-8">{t("common.loading")}</div>;
  }
  if (messages.length === 0) {
    return <div className="p-8 text-muted">{t("chatHistory.empty")}</div>;
  }
  return (
    <div className="p-4 sm:p-8">
      <h1 className="text-2xl font-bold mb-4">{t("chatHistory.title")}</h1>
      <Button variant="danger" onClick={() => setConfirmingClear(true)} className="mb-4 flex items-center gap-1.5">
        <Trash2 size={16} />{t("chatHistory.clearAll")}
      </Button>
      {hasMore && (
        <div className="mb-4 flex justify-center">
          <Button variant="secondary" onClick={loadOlder} disabled={loadingOlder}>
            {loadingOlder ? t("common.loading") : t("chatHistory.loadOlder")}
          </Button>
        </div>
      )}
      <div className="space-y-4">
        {messages.map((m) => (
          <div key={m.id} className="bg-surface border border-border rounded-xl p-5 shadow-soft">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs uppercase tracking-wide text-muted">{m.role === "assistant" ? t("chatHistory.assistant") : t("chatHistory.you")}</span>
              <button
                onClick={() => setPendingDelete(m.id)}
                className="text-muted hover:text-danger transition"
                aria-label={t("chatHistory.deleteMessage")}
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
                <h4 className="text-sm font-semibold text-muted">{t("chatHistory.sources")}</h4>
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
        <div ref={endRef} />
      </div>
      <ConfirmDialog
        open={pendingDelete !== null}
        title={t("chatHistory.deleteMessage")}
        message={t("chatHistory.deleteMessageBody")}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
      <ConfirmDialog
        open={confirmingClear}
        title={t("chatHistory.clearTitle")}
        message={t("chatHistory.clearBody", { name: currentPet.name })}
        confirmLabel={t("chatHistory.clearAll")}
        onConfirm={handleClear}
        onCancel={() => setConfirmingClear(false)}
      />
    </div>
  );
}