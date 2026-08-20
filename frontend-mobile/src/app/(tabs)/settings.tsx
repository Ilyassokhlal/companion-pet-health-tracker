import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Button from "@/components/ui/Button";
import { useAuth } from "@/auth/AuthContext";

export default function Settings() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      className="flex-1 bg-ink"
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16 }}
    >
      <Text className="mb-6 text-2xl font-bold text-fg">Settings</Text>

      <View className="mb-6 rounded-xl border border-border bg-surface p-5">
        <Text className="text-sm text-muted">Signed in as</Text>
        <Text className="text-fg">{user?.email}</Text>
        {user && !user.email_verified ? (
          <Text className="mt-2 text-sm text-danger">Email not verified</Text>
        ) : null}
      </View>

      <Button label="Log out" variant="secondary" onPress={logout} />
    </ScrollView>
  );
}