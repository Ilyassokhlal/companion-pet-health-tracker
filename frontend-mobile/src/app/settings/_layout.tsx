import { Stack } from "expo-router";
import { View } from "react-native";

import PatternBackground from "@/components/PatternBackground";

// Layout for the settings stack. Paints the pattern background once for all settings screens.
// This ensures that the pattern background remains visible behind all settings screens.
export default function SettingsLayout() {
  return (
    <View className="flex-1 bg-ink">
      <PatternBackground />
      <Stack screenOptions={{ headerShown: false }} />
    </View>
  );
}