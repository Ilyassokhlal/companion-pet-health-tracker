import { Stack } from "expo-router";

// Same as the tracking stack: no header, since system back covers it and each screen paints its own title and top inset.
export default function SettingsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}