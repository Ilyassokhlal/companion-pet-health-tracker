import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { usePets } from "../context/PetContext";
import { askStream } from "../api/chat";
import type { Citation } from "../types";

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
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-blue-600 text-white text-2xl shadow-lg"
        >
          💬
        </button>
      )}
      {open && (
        <div className="fixed bottom-6 right-6 w-96 max-w-[calc(100vw-3rem)] h-[32rem] max-h-[calc(100vh-3rem)] bg-white border rounded-lg shadow-xl flex flex-col">

          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">Ask about {currentPet.name}</h2>
            <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-700">
              ✕
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {turns.map((t, idx) => (
              <div key={idx} className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] p-2 rounded-lg ${t.role === "user" ? "bg-blue-100 text-right" : "bg-gray-100 text-left"}`}>
                  {t.role === "user" ? (
                    <span>{t.content}</span>
                  ) : (
                    <>
                      {t.content ? (
                        <ReactMarkdown>{t.content}</ReactMarkdown>
                      ) : (
                        <span className="text-gray-400">🤔 Thinking…</span>
                      )}
                      {t.sources && t.sources.length > 0 && (
                        <div className="mt-2 text-sm text-gray-500">
                          Sources:{" "}
                          {t.sources.map((s, i) => (
                            <span key={i}>
                              {i > 0 && ", "}
                              <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline">
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

          <form onSubmit={handleAsk} className="flex p-4 border-t">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="flex-1 border rounded-lg p-2 mr-2"
              placeholder="Ask a question..."
            />
            <button type="submit" disabled={streaming} className="bg-blue-600 text-white px-4 py-2 rounded-lg">
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
