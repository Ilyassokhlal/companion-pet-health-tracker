import { useTheme } from "../theme/ThemeContext";
import { OPACITY, PATTERN_TILES, TILE } from "../theme/patterns";

// One tiled SVG <pattern> rather than hundreds of DOM nodes: the browser repeats a single rect
// natively. Lucide draws with currentColor, so text-primary tints the whole field for free and it
// re-tints on every accent and light/dark change with no extra work.
export default function PatternBackground() {
  const { pattern } = useTheme();
  if (pattern === "none") return null;

  return (
    <svg
      aria-hidden="true"
      style={{ opacity: OPACITY }}
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full text-primary"
    >
      <defs>
        <pattern id="companion-pattern" width={TILE} height={TILE} patternUnits="userSpaceOnUse">
          {PATTERN_TILES[pattern].map(({ Icon, x, y, size, rotate }, i) => (
            <g key={i} transform={`translate(${x} ${y}) rotate(${rotate} ${size / 2} ${size / 2})`}>
              <Icon width={size} height={size} strokeWidth={2} />
            </g>
          ))}
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#companion-pattern)" />
    </svg>
  );
}