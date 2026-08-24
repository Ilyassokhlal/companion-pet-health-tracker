export type Theme = "dark" | "light";
export type Accent = "purple" | "yellow" | "green" | "blue" | "pink";

export const ACCENTS: Accent[] = ["purple", "yellow", "green", "blue", "pink"];

const NEUTRALS: Record<Theme, Record<string, string>> = {
  dark: {
    "--color-ink": "#0b0a0f",
    "--color-surface": "#16131f",
    "--color-border": "#2a2340",
    "--color-fg": "#ece9f5",
    "--color-muted": "#9c93b8",
    "--color-danger": "#dc2626",
    "--color-on-primary": "#17131f",
    "--color-hover": "rgba(255, 255, 255, 0.05)",
  },
  light: {
    "--color-ink": "#f7f5fa",
    "--color-surface": "#ffffff",
    "--color-border": "#e4e0ee",
    "--color-fg": "#17131f",
    "--color-muted": "#6a6280",
    "--color-danger": "#dc2626",
    "--color-on-primary": "#ffffff",
    "--color-hover": "rgba(23, 19, 31, 0.05)",
  },
};

const ACCENT_COLORS: Record<Theme, Record<Accent, { primary: string; hover: string }>> = {
  dark: {
    purple: { primary: "#a78bfa", hover: "#c4b5fd" },
    yellow: { primary: "#facc15", hover: "#fde047" },
    green:  { primary: "#4ade80", hover: "#86efac" },
    blue:   { primary: "#60a5fa", hover: "#93c5fd" },
    pink:   { primary: "#f472b6", hover: "#f9a8d4" },
  },
  light: {
    purple: { primary: "#6d28d9", hover: "#5b21b6" },
    yellow: { primary: "#a16207", hover: "#854d0e" },
    green:  { primary: "#15803d", hover: "#166534" },
    blue:   { primary: "#1d4ed8", hover: "#1e40af" },
    pink:   { primary: "#be185d", hover: "#9d174d" },
  },
};

// Returns the flat { "--color-x": value } map for a theme + accent pair.
export function themeVars(theme: Theme, accent: Accent): Record<string, string> {
  return {
    ...NEUTRALS[theme],
    "--color-primary": ACCENT_COLORS[theme][accent].primary,
    "--color-primary-hover": ACCENT_COLORS[theme][accent].hover,
  };
}

// The accent's own colour, for rendering the swatch buttons.
export function accentColor(theme: Theme, accent: Accent): string {
  return ACCENT_COLORS[theme][accent].primary;
}

// Returns a flat object of theme colors for a given theme and accent.
export function themeColors(theme: Theme, accent: Accent) {
  const n = NEUTRALS[theme];
  return {
    ink: n["--color-ink"],
    surface: n["--color-surface"],
    border: n["--color-border"],
    fg: n["--color-fg"],
    muted: n["--color-muted"],
    danger: n["--color-danger"],
    onPrimary: n["--color-on-primary"],
    primary: ACCENT_COLORS[theme][accent].primary,
  };
}