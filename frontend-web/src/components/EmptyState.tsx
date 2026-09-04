import type { LucideIcon } from "lucide-react";

// A reusable empty state component with an icon and a text message. The icon is displayed above the text, and both are centered with some padding around them.
export default function EmptyState({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="rounded-full border border-border bg-ink p-4">
        <Icon size={28} strokeWidth={1.5} className="text-muted" />
      </div>
      <p className="max-w-sm text-muted">{text}</p>
    </div>
  );
}