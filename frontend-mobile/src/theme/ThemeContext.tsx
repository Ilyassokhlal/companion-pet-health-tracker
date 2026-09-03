import AsyncStorage from "@react-native-async-storage/async-storage";
import { vars } from "nativewind";
import { Appearance } from "react-native";
import { createContext, useContext, useEffect, useState } from "react";
import { ACCENTS, themeVars, type Accent, type Theme } from "./palette";
import { PATTERNS, type Pattern } from "./patterns";

type ThemeContextValue = {
  theme: Theme;
  accent: Accent;
  pattern: Pattern;
  loading: boolean;
  setTheme: (t: Theme) => void;
  setAccent: (a: Accent) => void;
  setPattern: (p: Pattern) => void;
  style: Record<string, string>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [accent, setAccentState] = useState<Accent>("purple");
  // Per-device look, stored beside theme and accent rather than on the user record.
  const [pattern, setPatternState] = useState<Pattern>("paws");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      try {
        const storedTheme = await AsyncStorage.getItem("theme");
        const storedAccent = await AsyncStorage.getItem("accent");
        const storedPattern = await AsyncStorage.getItem("pattern");
        if (storedTheme === "dark" || storedTheme === "light") {
          setThemeState(storedTheme);
        }
        if (storedAccent && ACCENTS.includes(storedAccent as Accent)) {
          setAccentState(storedAccent as Accent);
        }
        if (storedPattern && PATTERNS.includes(storedPattern as Pattern)) {
          setPatternState(storedPattern as Pattern);
        }
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    AsyncStorage.setItem("theme", t);
  };

  const setAccent = (a: Accent) => {
    setAccentState(a);
    AsyncStorage.setItem("accent", a);
  };

  const setPattern = (p: Pattern) => {
    setPatternState(p);
    AsyncStorage.setItem("pattern", p);
  };

  const style = vars(themeVars(theme, accent));

  // Update the system color scheme to match the selected theme. This ensures that keyboards, native date pickers, and system dialogs reflect the chosen theme.
  useEffect(() => {
    Appearance.setColorScheme(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, accent, pattern, loading, setTheme, setAccent, setPattern, style }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}