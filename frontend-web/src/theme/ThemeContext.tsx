import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "dark" | "light";
export type Accent = "purple" | "yellow" | "green" | "blue" | "pink";

export const ACCENTS: Accent[] = ["purple", "yellow", "green", "blue", "pink"];

type ThemeContextValue = {
  theme: Theme;
  accent: Accent;
  setTheme: (t: Theme) => void;
  setAccent: (a: Accent) => void;
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

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.accent = accent;
    localStorage.setItem("accent", accent);
  }, [accent]);

  return (
    <ThemeContext.Provider value={{ theme, accent, setTheme, setAccent }}>
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