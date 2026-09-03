import { useWindowDimensions, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import { useTheme } from "@/theme/ThemeContext";
import { themeColors } from "@/theme/palette";
import { OPACITY, PATTERN_TILES, TILE } from "@/theme/patterns";

export default function PatternBackground() {
  // Get the current theme, accent color, and pattern from the theme context. Also get the window dimensions.
  const { theme, accent, pattern } = useTheme();
  const { width, height } = useWindowDimensions();

  if (pattern === "none") return null;

  const colors = themeColors(theme, accent);
  const motifs = PATTERN_TILES[pattern];
  const cols = Math.ceil(width / TILE);
  const rows = Math.ceil(height / TILE);

  const tiles: { key: string; name: (typeof motifs)[number]["name"]; left: number; top: number; size: number; rotate: number }[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      for (const motif of motifs) {
        tiles.push({
          key: `${row}-${col}-${motif.name}-${motif.x}`,
          name: motif.name,
          left: col * TILE + motif.x,
          top: row * TILE + motif.y,
          size: motif.size,
          rotate: motif.rotate,
        });
      }
    }
  }

  return (
    <View
      pointerEvents="none"
      style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, opacity: OPACITY, overflow: "hidden" }}
    >
      {tiles.map((tile) => (
        <MaterialCommunityIcons
          key={tile.key}
          name={tile.name}
          size={tile.size}
          color={colors.primary}
          style={{ position: "absolute", left: tile.left, top: tile.top, transform: [{ rotate: `${tile.rotate}deg` }] }}
        />
      ))}
    </View>
  );
}