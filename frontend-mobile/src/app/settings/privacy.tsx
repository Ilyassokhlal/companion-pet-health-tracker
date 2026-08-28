import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";

import { useTheme } from "@/theme/ThemeContext";
import { themeColors } from "@/theme/palette";

// The legal pages are hosted by the web app. Hardcoded rather than derived from
// EXPO_PUBLIC_API_URL, which points at localhost in development. These must always resolve to
// production, since store reviewers fetch them.
const SITE = "https://mycompanion.pet";

// Chrome Custom Tabs renders inside our task but with Chrome's own chrome. Tinting it to the app
// palette is what makes it read as in-app rather than as a hand-off.
const browserOptions = (c: ReturnType<typeof themeColors>) => ({
  toolbarColor: c.surface,
  controlsColor: c.primary,
  showTitle: false,
  enableBarCollapsing: true,
});

export default function Privacy() {
  const insets = useSafeAreaInsets();
  const { theme, accent } = useTheme();
  const browser = browserOptions(themeColors(theme, accent));

  return (
    <ScrollView
      className="flex-1 bg-ink"
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16 }}
    >
      <Text className="mb-6 text-2xl font-bold text-fg">Data & Privacy</Text>

      <View className="mb-6 rounded-xl border border-border bg-surface p-5">
        <Text className="mb-4 text-lg font-semibold text-fg">Legal</Text>
        <Pressable
          onPress={() => WebBrowser.openBrowserAsync(`${SITE}/privacy`, browser)}
          className="mb-3 active:opacity-70"
        >
          <Text className="text-primary">Privacy Policy</Text>
        </Pressable>
        <Pressable
          onPress={() => WebBrowser.openBrowserAsync(`${SITE}/terms`, browser)}
          className="active:opacity-70"
        >
          <Text className="text-primary">Terms of Service</Text>
        </Pressable>
      </View>

    </ScrollView>
  );
}