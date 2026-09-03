import { Bone, Cat, Dog, Fish, PawPrint, type LucideIcon } from "lucide-react";

export const PATTERNS = ["none", "paws", "bones", "pond", "menagerie"] as const;
export type Pattern = (typeof PATTERNS)[number];

type Motif = { Icon: LucideIcon; x: number; y: number; size: number; rotate: number };

// Defines the size of a single pattern tile. All motif coordinates are relative to this tile.
// Each pattern consists of multiple motifs, each with its own position, size, and rotation within the tile.
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
    { Icon: PawPrint, x: 60, y: 58, size: 20, rotate: 16 },
  ],
  pond: [
    { Icon: Fish, x: 12, y: 18, size: 26, rotate: -10 },
    { Icon: PawPrint, x: 58, y: 60, size: 18, rotate: 24 },
  ],
  menagerie: [
    { Icon: Dog, x: 10, y: 14, size: 24, rotate: -8 },
    { Icon: Fish, x: 58, y: 20, size: 18, rotate: 14 },
    { Icon: Cat, x: 14, y: 58, size: 22, rotate: 10 },
    { Icon: Bone, x: 60, y: 62, size: 18, rotate: -20 },
  ],
};