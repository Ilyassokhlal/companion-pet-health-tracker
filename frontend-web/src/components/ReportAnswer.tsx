import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { Flag } from "lucide-react";
import { reportMessage, REPORT_REASONS } from "../api/chat";
import type { ReportReason } from "../api/chat";
import { errorMessage } from "../errors";
import Button from "./ui/Button";

interface Props {
  messageId: number;
  reported: boolean;
  onReported: () => void;
}

// The flag under an AI answer and the dialog it opens. Google Play requires a way to report an answer inside the app.
// Not built on Modal, which sends a locked account to the subscribe screen: reporting stays open when locked.
// The dialog goes to the end of the page body, because the chat panel moves with a transform, and that would trap a fixed overlay inside it.
export default function ReportAnswer({ messageId, reported, onReported }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  if (reported) {
    return (
      <div className="mt-2 flex items-center gap-1 text-xs text-muted">
        <Flag size={12} />
        {t("report.reported")}
      </div>
    );
  }

  function start() {
    setReason(null);
    setNote("");
    setError("");
    setOpen(true);
  }

  async function send() {
    if (!reason) return;
    setSending(true);
    setError("");
    try {
      await reportMessage(messageId, reason, note);
      setOpen(false);
      onReported();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={start}
        className="mt-2 flex text-muted hover:text-fg transition"
        title={t("report.flag")}
        aria-label={t("report.flag")}
      >
        <Flag size={14} />
      </button>
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={t("report.title")}
              className="bg-surface border border-border rounded-xl shadow-soft w-full max-w-md max-h-[90vh] overflow-y-auto p-6 text-fg"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold">{t("report.title")}</h3>
              <p className="mt-2 text-sm text-muted">{t("report.intro")}</p>
              <div role="radiogroup" className="mt-4 space-y-2">
                {REPORT_REASONS.map((code) => (
                  <label
                    key={code}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition ${
                      reason === code ? "border-primary bg-hover" : "border-border hover:border-primary"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`report-reason-${messageId}`}
                      value={code}
                      checked={reason === code}
                      onChange={() => setReason(code)}
                      className="accent-primary"
                    />
                    {t(`report.reasons.${code}`)}
                  </label>
                ))}
              </div>
              <label className="mt-4 block">
                <span className="block text-sm text-muted mb-1">{t("report.note")}</span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={3}
                  maxLength={1000}
                  dir="auto"
                  className="w-full rounded-lg bg-ink border border-border px-3 py-2 text-sm text-fg focus:border-primary focus:outline-none"
                />
              </label>
              <p className="mt-3 text-xs text-muted">{t("report.notice")}</p>
              {error && <p className="mt-3 text-sm text-danger">{error}</p>}
              <div className="flex justify-end gap-2 mt-4">
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                  {t("common.cancel")}
                </Button>
                <Button type="button" onClick={send} disabled={!reason || sending}>
                  {t("report.send")}
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
