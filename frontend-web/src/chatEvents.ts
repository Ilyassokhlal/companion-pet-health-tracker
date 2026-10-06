// The chat panel lives in the layout, outside every page. The Get started card is the only page part that needs it,
// so the two talk through window events rather than a context wrapped around the whole app.
const OPEN = "companion:open-chat";
const ASKED = "companion:asked";

// Opens the chat panel from anywhere on the page
export function openChat() {
  window.dispatchEvent(new Event(OPEN));
}

// Runs handler whenever something asks for the chat panel. Returns the unsubscribe, ready for an effect's cleanup.
export function onOpenChat(handler: () => void) {
  window.addEventListener(OPEN, handler);
  return () => window.removeEventListener(OPEN, handler);
}

// Tells the page a question was just asked, so a step waiting on one can tick
export function announceAsked() {
  window.dispatchEvent(new Event(ASKED));
}

// Runs handler after every question asked. Returns the unsubscribe.
export function onAsked(handler: () => void) {
  window.addEventListener(ASKED, handler);
  return () => window.removeEventListener(ASKED, handler);
}
