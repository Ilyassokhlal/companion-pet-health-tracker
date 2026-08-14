import type { ReactNode } from "react";

// A Section component that wraps its children in a styled section element. It optionally displays a title above the content. The section has a background, border, padding, and margin applied for consistent styling across the application.
export default function Section({ title, children }: { title?: string; children: ReactNode }) {
  <section className="bg-surface border border-border rounded-lg p-6 mb-6">
    {title && <h2 className="text-lg font-semibold mb-4">{title}</h2>}
    {children}
  </section>
}