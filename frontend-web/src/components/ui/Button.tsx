import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}
// A reusable Button component that supports different variants (primary, secondary, danger) and accepts standard button attributes. It applies appropriate styling based on the variant and allows for additional class names to be passed in.
export default function Button({ variant = "primary", className = "", ...props }: Props) {
    const base = "rounded px-4 py-2 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed";
    const variants = {
      primary: "bg-primary hover:bg-primary-hover text-white",
      secondary: "bg-surface border border-border text-fg hover:border-primary",
      danger: "bg-danger hover:brightness-110 text-white",
    };

    return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}