import type { LucideIcon } from "lucide-react";

// A reusable empty state component with an icon and a text message. The icon is displayed above the text, and both are centered with some padding around them.
// The hint, when there is one, says what the screen is for, so a new account learns why it might fill it. The text then reads as its heading.
export default function EmptyState({ icon: Icon, text, hint }: { icon: LucideIcon; text: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="rounded-full border border-border bg-ink p-4">
        <Icon size={28} strokeWidth={1.5} className="text-muted" />
      </div>
      <div className="max-w-sm space-y-1">
        <p className={hint ? "font-medium text-fg" : "text-muted"}>{text}</p>
        {hint && <p className="text-sm text-muted">{hint}</p>}
      </div>
    </div>
  );
}
