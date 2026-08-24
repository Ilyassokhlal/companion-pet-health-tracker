import { useTheme, ACCENTS } from "../theme/ThemeContext";

// Component for changing the appearance settings: theme and accent color.
export default function AppearanceSettings() {
  const { theme, accent, setTheme, setAccent } = useTheme();

  return (
    <section className="p-6 bg-surface border border-border rounded-xl shadow-soft mb-6">
      <h2 className="text-lg font-semibold mb-4">Appearance</h2>

      <label className="flex items-center gap-2 mb-4">
        <input
          type="checkbox"
          checked={theme === "dark"}
          onChange={(e) => setTheme(e.target.checked ? "dark" : "light")}
          className="accent-primary"
        />
        <span>Dark Mode</span>
      </label>

      <div className="flex items-center justify-between gap-4">
        <span className="text-muted text-sm">Accent</span>
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
    </section>
  );
}