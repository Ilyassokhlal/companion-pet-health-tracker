import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Circle, Footprints, Scale, Utensils, Wallet } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { gettingStarted, readTrackers, updateMe } from "../api/auth";
import { onAsked, openChat } from "../chatEvents";
import type { GettingStarted } from "../types";
import Button from "./ui/Button";
import Modal from "./ui/Modal";
import RecordForm from "./RecordForm";
import EventForm from "./EventForm";

// The steps in the order they are shown. The pet is first and always done here, since the dashboard only shows the card once there is one.
const STEPS = ["pet", "record", "photo", "question", "appointment", "tracking"] as const;
type Step = (typeof STEPS)[number];

// The four trackers the introduction walks through, each linking to its page
const TRACKERS = [
  { key: "weight", to: "/tracking/weight", Icon: Scale },
  { key: "walks", to: "/tracking/walks", Icon: Footprints },
  { key: "feeding", to: "/tracking/feeding", Icon: Utensils },
  { key: "budget", to: "/tracking/budget", Icon: Wallet },
];

// The dashboard's Get started card for a new account. The server records each step the moment it happens, on any pet and from any device,
// and a step stays done once it is. When the last one is done the card turns into a short All set line, and closing that, or Hide, hides it.
// Settings can bring it back. onSaved lets the dashboard reload what a step added.
export default function GetStarted({ petId, onSaved }: { petId: number; onSaved: () => void }) {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const [done, setDone] = useState<GettingStarted | null>(null);
  const [open, setOpen] = useState<"record" | "appointment" | "trackers" | null>(null);
  // A locked account can't add anything, so it is not asked to
  const showing = Boolean(user && !user.onboarding_hidden && user.access !== "locked");

  const load = useCallback(() => {
    gettingStarted().then(setDone).catch(console.error);
  }, []);

  useEffect(() => {
    if (!showing) return;
    load();
    // Questions are asked in the chat panel, outside the dashboard
    return onAsked(load);
  }, [showing, load]);

  // Closing the introduction or following one of its links both count as reading it
  const closeTrackers = useCallback(() => {
    setOpen(null);
    readTrackers().then(load).catch(console.error);
  }, [load]);

  const closeForm = useCallback(() => setOpen(null), []);

  if (!showing || !done) return null;
  const count = STEPS.filter((step) => done[step]).length;

  async function hide() {
    try {
      await updateMe({ onboarding_hidden: true });
      await refreshUser();
    } catch (err) {
      console.error(err);
    }
  }

  if (count === STEPS.length) {
    return (
      <section className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-border bg-surface p-6 shadow-soft">
        <div className="flex items-center gap-3">
          <CheckCircle2 size={24} className="shrink-0 text-primary" />
          <div>
            <h2 className="font-semibold">{t("onboarding.allSetTitle")}</h2>
            <p className="text-sm text-muted">{t("onboarding.allSetBody")}</p>
          </div>
        </div>
        <Button variant="secondary" onClick={hide} className="shrink-0">
          {t("common.close")}
        </Button>
      </section>
    );
  }

  function act(step: Step) {
    if (step === "question") openChat();
    // A photo is attached to a record, so both steps open the record form, which takes photos
    else if (step === "record" || step === "photo") setOpen("record");
    else if (step === "appointment") setOpen("appointment");
    else if (step === "tracking") setOpen("trackers");
  }

  function saved(didSave: boolean) {
    setOpen(null);
    if (!didSave) return;
    load();
    onSaved();
  }

  return (
    <section className="mb-6 rounded-xl border border-border bg-surface p-6 shadow-soft">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{t("onboarding.title")}</h2>
        <button onClick={hide} className="text-sm text-muted transition hover:text-fg">
          {t("onboarding.hide")}
        </button>
      </div>
      <ul className="divide-y divide-border">
        {STEPS.map((step) => (
          <li key={step} className="flex min-h-12 items-center justify-between gap-3 py-2">
            <span className={`flex items-center gap-3 ${done[step] ? "text-muted" : ""}`}>
              {done[step] ? (
                <CheckCircle2 size={20} className="shrink-0 text-primary" />
              ) : (
                <Circle size={20} className="shrink-0 text-muted" />
              )}
              {t(`onboarding.steps.${step}`)}
            </span>
            {!done[step] && step !== "pet" && (
              <Button variant="secondary" onClick={() => act(step)} className="shrink-0 px-3 py-1 text-sm">
                {t(`onboarding.actions.${step}`)}
              </Button>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(count / STEPS.length) * 100}%` }} />
        </div>
        <span className="shrink-0 text-sm text-muted">{t("onboarding.progress", { done: count, total: STEPS.length })}</span>
      </div>

      <Modal open={open === "record"} title={t("records.add")} onClose={closeForm}>
        {open === "record" && <RecordForm petId={petId} onDone={saved} />}
      </Modal>
      <Modal open={open === "appointment"} title={t("dashboard.scheduleSomething")} onClose={closeForm}>
        {open === "appointment" && <EventForm petId={petId} onDone={saved} />}
      </Modal>
      <Modal open={open === "trackers"} title={t("onboarding.trackersTitle")} onClose={closeTrackers}>
        <p className="text-muted">{t("onboarding.trackersIntro")}</p>
        <ul className="mt-5 space-y-4">
          {TRACKERS.map(({ key, to, Icon }) => (
            <li key={key}>
              <Link to={to} onClick={closeTrackers} className="group flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition group-hover:bg-primary/20">
                  <Icon size={20} />
                </span>
                <span>
                  <span className="block font-semibold text-fg group-hover:text-primary">{t(`tracking.${key}`)}</span>
                  <span className="block text-sm text-muted">{t(`onboarding.trackers.${key}`)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Button onClick={closeTrackers} className="mt-6 w-full">
          {t("onboarding.gotIt")}
        </Button>
      </Modal>
    </section>
  );
}
