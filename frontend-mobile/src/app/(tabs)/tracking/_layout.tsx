import { Stack } from "expo-router";

// No header needed. Android's has system back and iOS has edge-swipe already, and every screen in this app paints its own title and top inset rather than relying on navigator chrome.
export default function TrackingLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
