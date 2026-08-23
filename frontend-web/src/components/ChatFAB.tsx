import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { usePets } from "../context/PetContext";
import { askStream } from "../api/chat";
import type { Citation } from "../types";
import Button from "./ui/Button";
import Input from "./ui/Input";
import { MessageCircle, X, Send, Maximize2 } from "lucide-react";

interface Turn {
  role: "user" | "assistant";
  content: string;
  sources?: Citation[];
}

// Desktop panel presets, cycled from the header. Mobile ignores these — the panel is full-screen below sm.
// Each entry must stay a complete literal class string:
// Tailwind scans source text, so anything assembled by concatenation is never emitted.
const SIZES = [
  { label: "Small", className: "sm:w-80 sm:h-[26rem]" },
  { label: "Medium", className: "sm:w-96 sm:h-[32rem]" },
  { label: "Large", className: "sm:w-[34rem] sm:h-[42rem]" },
];

export default function ChatFAB() {
  const { currentPet } = usePets();
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState(1);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const [streaming, setStreaming] = useState(false);

  // Desktop-only drag. The panel keeps its bottom-right anchor; this is an offset from it.
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ px: number; py: number; ox: number; oy: number } | null>(null);

  // An offset left over from a desktop drag would shift the full-screen mobile panel.
  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth < 640) setOffset({ x: 0, y: 0 });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (window.innerWidth < 640) return;
    if ((e.target as HTMLElement).closest("button")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { px: e.clientX, py: e.clientY, ox: offset.x, oy: offset.y };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragStart.current;
    if (!d || !panelRef.current) return;
    const rect = panelRef.current.getBoundingClientRect();
    const baseLeft = rect.left - offset.x;
    const baseTop = rect.top - offset.y;
    const x = Math.min(Math.max(d.ox + e.clientX - d.px, -baseLeft), window.innerWidth - rect.width - baseLeft);
    const y = Math.min(Math.max(d.oy + e.clientY - d.py, -baseTop), window.innerHeight - rect.height - baseTop);
    setOffset({ x, y });
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    dragStart.current = null;
  };
  
  const handleAsk = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!currentPet || !question.trim() || streaming) return;
    const userTurn: Turn = { role: "user", content: question };
    const assistantTurn: Turn = { role: "assistant", content: "" };
    setTurns([...turns, userTurn, assistantTurn]);
    setQuestion("");
    setStreaming(true);
    try {
      for await (const event of askStream(currentPet.id, question)) {
        if (event.type === "token") {
          setTurns(prevTurns => {
            const newTurns = [...prevTurns];
            const last = newTurns.length - 1;
            newTurns[last] = { ...newTurns[last], content: newTurns[last].content + event.value };
            return newTurns;
          });
        } else if (event.type === "meta") {
          setTurns(prevTurns => {
            const newTurns = [...prevTurns];
            const last = newTurns.length - 1;
            newTurns[last] = { ...newTurns[last], sources: event.sources };
            return newTurns;
          });
        }
      }
    } catch (err) {
      setTurns(prevTurns => {
        const newTurns = [...prevTurns];
        const last = newTurns.length - 1;
        newTurns[last] = { ...newTurns[last], content: newTurns[last].content + `\n\nError: ${(err as Error).message}` };
        return newTurns;
      });
    } finally {
      setStreaming(false);
    }
}

  if (!currentPet) return null;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary hover:bg-primary-hover text-white text-2xl shadow-glow transition-transform hover:scale-105 active:scale-95"
        >
          <MessageCircle size={24} className="mx-auto" />
        </button>
      )}
      {open && (
        <div
          ref={panelRef}
          style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
          className={`fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 ${SIZES[size].className} sm:max-h-[calc(100vh-3rem)] sm:rounded-2xl bg-surface border border-border shadow-soft flex flex-col overflow-hidden z-50`}
        >

          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className="flex items-center justify-between p-4 border-b border-border select-none sm:cursor-move"
          >
            <h2 className="text-lg font-semibold">Ask about {currentPet.name}</h2>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-xs text-muted">{SIZES[size].label}</span>
              <button
                onClick={() => setSize((size + 1) % SIZES.length)}
                className="hidden sm:block text-muted hover:text-fg transition"
                title="Change panel size"
                aria-label="Change panel size"
              >
                <Maximize2 size={16} />
              </button>
              <button onClick={() => setOpen(false)} className="text-muted hover:text-fg transition">
                <X size={20} />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {turns.map((t, idx) => (
              <div key={idx} className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-xl text-sm ${t.role === "user" ? "bg-primary text-white" : "bg-ink border border-border text-fg"}`}>
                  {t.role === "user" ? (
                    <span>{t.content}</span>
                  ) : (
                    <>
                      {t.content ? (
                        <div className="[&_ul]:list-disc [&_ul]:pl-5 [&_p]:mb-2 [&_h2]:font-semibold [&_h3]:font-semibold [&_strong]:text-fg">
                          <ReactMarkdown>{t.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <span className="text-muted">🤔 Thinking…</span>
                      )}
                      {t.sources && t.sources.length > 0 && (
                        <div className="mt-2 text-sm text-muted">
                          Sources:{" "}
                          {t.sources.map((s, i) => (
                            <span key={i}>
                              {i > 0 && ", "}
                              <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                {s.title}
                              </a>
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleAsk} className="flex p-4 border-t border-border">
            <Input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="flex-1 mr-2"
              placeholder="Ask a question..."
            />
            <Button type="submit" disabled={streaming} aria-label="Send">
              <Send size={16} />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
