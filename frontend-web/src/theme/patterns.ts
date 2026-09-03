import { Bone, Fish, PawPrint, type LucideIcon } from "lucide-react";

export const PATTERNS = ["none", "paws", "bones", "fish", "mixed"] as const;
export type Pattern = (typeof PATTERNS)[number];

type Motif = { Icon: LucideIcon; x: number; y: number; size: number; rotate: number };

// One tile, repeated natively by SVG <pattern>. Coordinates are inside a TILE x TILE box.
// Motifs come from lucide rather than hand-drawn paths, so they stay consistent with the icons
// already used across the app and there is no new artwork to maintain.
export const TILE = 96;

// How present the pattern is. Web needs more than mobile: lucide draws thin outlines, where
// MaterialCommunityIcons glyphs are solid and carry far more ink per motif.
export const OPACITY = 0.16;

export const PATTERN_TILES: Record<Exclude<Pattern, "none">, Motif[]> = {
  paws: [
    { Icon: PawPrint, x: 14, y: 16, size: 26, rotate: -14 },
    { Icon: PawPrint, x: 58, y: 56, size: 20, rotate: 22 },
  ],
  bones: [
    { Icon: Bone, x: 10, y: 20, size: 26, rotate: -18 },
    { Icon: Bone, x: 58, y: 58, size: 20, rotate: 16 },
  ],
  fish: [
    { Icon: Fish, x: 12, y: 18, size: 26, rotate: -10 },
    { Icon: Fish, x: 58, y: 60, size: 20, rotate: 24 },
  ],
  mixed: [
    { Icon: PawPrint, x: 12, y: 14, size: 24, rotate: -12 },
    { Icon: Bone, x: 58, y: 26, size: 22, rotate: 18 },
    { Icon: Fish, x: 30, y: 60, size: 22, rotate: 8 },
  ],
};