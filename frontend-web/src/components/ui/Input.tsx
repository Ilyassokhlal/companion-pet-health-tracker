import type { InputHTMLAttributes } from "react";

// A reusable Input component that accepts standard input attributes and applies consistent styling. It allows for additional class names to be passed in for further customization.
export default function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
    return (
    <input
      className={`w-full rounded bg-surface border border-border px-3 py-2 text-fg placeholder:text-muted focus:border-primary focus:outline-none ${className}`}
      {...props}
    />
  );
}