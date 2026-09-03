import { MaterialCommunityIcons } from "@expo/vector-icons";

type Glyph = keyof typeof MaterialCommunityIcons.glyphMap;

export const PATTERNS = ["none", "paws", "bones", "fish", "mixed"] as const;
export type Pattern = (typeof PATTERNS)[number];

type Motif = { name: Glyph; x: number; y: number; size: number; rotate: number };

// RN has no SVG <pattern>, so the tile is repeated by hand across the viewport. Motifs are glyphs
// from a font already bundled with @expo/vector-icons — cheap to render and no new artwork.
// Slightly larger than the web tile to keep the node count down on a phone.
export const TILE = 104;

// Lower than web's: these glyphs are filled, not outlined, so the same number reads much heavier.
export const OPACITY = 0.15;

export const PATTERN_TILES: Record<Exclude<Pattern, "none">, Motif[]> = {
  paws: [
    { name: "paw", x: 14, y: 16, size: 28, rotate: -14 },
    { name: "paw", x: 62, y: 60, size: 22, rotate: 22 },
  ],
  bones: [
    { name: "bone", x: 10, y: 20, size: 28, rotate: -18 },
    { name: "bone", x: 62, y: 62, size: 22, rotate: 16 },
  ],
  fish: [
    { name: "fish", x: 12, y: 18, size: 28, rotate: -10 },
    { name: "fish", x: 60, y: 64, size: 22, rotate: 24 },
  ],
  mixed: [
    { name: "paw", x: 12, y: 14, size: 26, rotate: -12 },
    { name: "bone", x: 62, y: 28, size: 24, rotate: 18 },
    { name: "fish", x: 32, y: 64, size: 24, rotate: 8 },
  ],
};