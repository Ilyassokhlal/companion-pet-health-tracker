import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}
// A reusable Button component that supports different variants (primary, secondary, danger) and accepts standard button attributes. It applies appropriate styling based on the variant and allows for additional class names to be passed in.
export default function Button({ variant = "primary", className = "", ...props }: Props) {
    const base = "rounded-lg px-4 py-2 font-medium transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100";
    const variants = {
      primary: "bg-primary hover:bg-primary-hover text-on-primary shadow-glow",
      secondary: "bg-surface border border-border text-fg hover:border-primary hover:bg-hover",
      danger: "bg-danger hover:brightness-110 text-white",
    };

    return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}