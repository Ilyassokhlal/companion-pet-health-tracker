import { MaterialCommunityIcons } from "@expo/vector-icons";

type Glyph = keyof typeof MaterialCommunityIcons.glyphMap;

export const PATTERNS = ["none", "paws", "bones", "pond", "menagerie"] as const;
export type Pattern = (typeof PATTERNS)[number];

type Motif = { name: Glyph; x: number; y: number; size: number; rotate: number };

// Size of each pattern tile in pixels. Used to repeat the pattern across the viewport.
export const TILE = 104;

export const PATTERN_TILES: Record<Exclude<Pattern, "none">, Motif[]> = {
  paws: [
    { name: "paw", x: 14, y: 16, size: 28, rotate: -14 },
    { name: "paw", x: 62, y: 60, size: 22, rotate: 22 },
  ],
  bones: [
    { name: "bone", x: 10, y: 20, size: 28, rotate: -18 },
    { name: "paw", x: 64, y: 62, size: 22, rotate: 16 },
  ],
  pond: [
    { name: "fish", x: 12, y: 18, size: 28, rotate: -10 },
    { name: "paw", x: 62, y: 64, size: 20, rotate: 24 },
  ],
  menagerie: [
    { name: "dog", x: 10, y: 14, size: 26, rotate: -8 },
    { name: "fish", x: 62, y: 22, size: 20, rotate: 14 },
    { name: "cat", x: 14, y: 62, size: 24, rotate: 10 },
    { name: "bone", x: 64, y: 66, size: 20, rotate: -20 },
  ],
};