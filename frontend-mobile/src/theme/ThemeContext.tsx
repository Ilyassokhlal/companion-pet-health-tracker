import AsyncStorage from "@react-native-async-storage/async-storage";
import { vars } from "nativewind";
import { Appearance } from "react-native";
import { createContext, useContext, useEffect, useState } from "react";
import { ACCENTS, themeVars, type Accent, type Theme } from "./palette";

type ThemeContextValue = {
  theme: Theme;
  accent: Accent;
  loading: boolean;
  setTheme: (t: Theme) => void;
  setAccent: (a: Accent) => void;
  style: Record<string, string>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("dark");
  const [accent, setAccentState] = useState<Accent>("purple");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      try {
        const storedTheme = await AsyncStorage.getItem("theme");
        const storedAccent = await AsyncStorage.getItem("accent");
        if (storedTheme === "dark" || storedTheme === "light") {
          setThemeState(storedTheme);
        }
        if (storedAccent && ACCENTS.includes(storedAccent as Accent)) {
          setAccentState(storedAccent as Accent);
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

  const style = vars(themeVars(theme, accent));

  // Keyboards, native date pickers and system dialogs read the RN colour scheme,
  // not our CSS variables. app.json is "automatic" so this override takes effect.
  useEffect(() => {
    Appearance.setColorScheme(theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, accent, loading, setTheme, setAccent, style }}>
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