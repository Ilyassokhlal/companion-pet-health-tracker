import { useTranslation } from "react-i18next";
import { useTheme, ACCENTS } from "../theme/ThemeContext";
import { PATTERNS } from "../theme/patterns";

// Component for changing the appearance settings: theme, accent color and background pattern.
export default function AppearanceSettings() {
  const { t } = useTranslation();
  const { theme, accent, pattern, setTheme, setAccent, setPattern } = useTheme();

  return (
    <section className="p-6 bg-surface border border-border rounded-xl shadow-soft mb-6">
      <h2 className="text-lg font-semibold mb-4">{t("settings.appearance.title")}</h2>

      <label className="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          checked={theme === "dark"}
          onChange={(e) => setTheme(e.target.checked ? "dark" : "light")}
          className="accent-primary"
        />
        <span>{t("settings.appearance.darkMode")}</span>
      </label>

      <div className="flex items-center justify-between gap-4 mb-4">
        <span className="text-muted text-sm">{t("settings.appearance.accent")}</span>
        <div className="flex gap-2">
          {ACCENTS.map((a) => (
            <button
              key={a}
              onClick={() => setAccent(a)}
              aria-label={a}
              data-theme={theme}
              data-accent={a}
              className={`w-6 h-6 rounded-full bg-primary ${accent === a ? "ring-2 ring-fg" : ""}`}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-muted text-sm">{t("settings.appearance.pattern")}</span>
        <div className="flex flex-wrap gap-2">
          {PATTERNS.map((p) => (
            <button
              key={p}
              onClick={() => setPattern(p)}
              className={`rounded-full px-3 py-1.5 text-sm transition ${
                pattern === p ? "bg-primary text-on-primary" : "bg-ink border border-border text-muted hover:text-fg"
              }`}
            >
              {t(`settings.appearance.patterns.${p}`)}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}