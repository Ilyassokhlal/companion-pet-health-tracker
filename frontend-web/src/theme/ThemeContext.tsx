import { createContext, useContext, useEffect, useState } from "react";
import { PATTERNS, type Pattern } from "./patterns";

export type Theme = "dark" | "light";
export type Accent = "purple" | "yellow" | "green" | "blue" | "pink";

export const ACCENTS: Accent[] = ["purple", "yellow", "green", "blue", "pink"];

type ThemeContextValue = {
  theme: Theme;
  accent: Accent;
  pattern: Pattern;
  setTheme: (t: Theme) => void;
  setAccent: (a: Accent) => void;
  setPattern: (p: Pattern) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

// ThemeProvider component that manages the theme and accent state, reads initial values from localStorage, and updates the document's dataset and localStorage when the values change. Provides the context to its children.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const storedTheme = localStorage.getItem("theme");
    return storedTheme === "dark" || storedTheme === "light" ? storedTheme : "dark";
  });

  const [accent, setAccent] = useState<Accent>(() => {
    const storedAccent = localStorage.getItem("accent");
    return ACCENTS.includes(storedAccent as Accent) ? (storedAccent as Accent) : "purple";
  });

  // Stored beside theme and accent rather than on the user record: it is a per-device look, and
  // keeping it local means no column, no migration and no request to change it.
  const [pattern, setPattern] = useState<Pattern>(() => {
    const stored = localStorage.getItem("pattern");
    return PATTERNS.includes(stored as Pattern) ? (stored as Pattern) : "paws";
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.accent = accent;
    localStorage.setItem("accent", accent);
  }, [accent]);

  useEffect(() => {
    localStorage.setItem("pattern", pattern);
  }, [pattern]);

  return (
    <ThemeContext.Provider value={{ theme, accent, pattern, setTheme, setAccent, setPattern }}>
      {children}
    </ThemeContext.Provider>
  );
}

// Custom hook to access the theme context. Throws an error if used outside the ThemeProvider.
export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
}