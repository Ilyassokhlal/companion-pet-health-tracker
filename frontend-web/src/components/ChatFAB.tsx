import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { usePets } from "../context/PetContext";
import { askStream } from "../api/chat";
import type { Citation } from "../types";
import Button from "./ui/Button";
import Input from "./ui/Input";

interface Turn {
  role: "user" | "assistant";
  content: string;
  sources?: Citation[];
}

export default function ChatFAB() {
  const { currentPet } = usePets();
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [question, setQuestion] = useState("");
  const [streaming, setStreaming] = useState(false);
  
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
          💬
        </button>
      )}
      {open && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 sm:w-96 sm:h-[32rem] sm:max-h-[calc(100vh-3rem)] sm:rounded-2xl bg-surface border border-border shadow-soft flex flex-col overflow-hidden z-50">

          <div className="flex items-center justify-between p-4 border-b border-border">
            <h2 className="text-lg font-semibold">Ask about {currentPet.name}</h2>
            <button onClick={() => setOpen(false)} className="text-muted hover:text-fg transition">
              ✕
            </button>
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
            <Button type="submit" disabled={streaming}>
              Send
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
