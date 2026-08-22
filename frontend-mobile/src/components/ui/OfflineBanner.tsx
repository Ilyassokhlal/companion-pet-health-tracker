import { Text, View } from "react-native";

// Shown when a screen is displaying cached data because the network was unreachable. savedAt is the ISO timestamp
// the cache entry was written; null means the data is live.
export default function OfflineBanner({ savedAt }: { savedAt: string | null }) {
  if (!savedAt) return null;

  return (
    <View className="border border-border bg-surface rounded-lg px-3 py-2 mb-4">
      <Text className="text-sm text-muted">
        Offline — showing records saved {new Date(savedAt).toLocaleString()}
      </Text>
    </View>
  );
}