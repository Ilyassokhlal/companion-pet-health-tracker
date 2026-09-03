import { useTheme } from "../theme/ThemeContext";
import { PATTERN_TILES, TILE } from "../theme/patterns";

// Renders a repeating SVG pattern in the background based on the current theme pattern. A single SVG <pattern> is used and repeated across the entire viewport. Lucide icons are used for the motifs, which inherit the current text color for easy theming.
export default function PatternBackground() {
  const { pattern } = useTheme();
  if (pattern === "none") return null;

  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full text-primary opacity-[0.07]"
    >
      <defs>
        <pattern id="companion-pattern" width={TILE} height={TILE} patternUnits="userSpaceOnUse">
          {PATTERN_TILES[pattern].map(({ Icon, x, y, size, rotate }, i) => (
            <g key={i} transform={`translate(${x} ${y}) rotate(${rotate} ${size / 2} ${size / 2})`}>
              <Icon width={size} height={size} strokeWidth={1.5} />
            </g>
          ))}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#companion-pattern)" />
    </svg>
  );
}