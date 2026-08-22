import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import Constants from "expo-constants";
import { registerDevice, unregisterDevice } from "./api/devices";

// Foreground behaviour. Without a handler, a notification that arrives while the app is open is
//  delivered silently and the user never sees it.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Asks permission, resolves this install's Expo push token, and registers it with the backend.
// Returns the token so logout can unregister the same one.
export async function registerForPush(): Promise<string | null> {
  if (!Device.isDevice) throw new Error("Not a physical device.");

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#FF231F7C",
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== "granted") throw new Error(`Notification permission: ${finalStatus}`);

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? "5cb22260-f674-45cd-900a-bf61e7b31e1d";

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await registerDevice(token, Platform.OS);
  return token;
}

// Drops the token server-side. MUST run before the auth token is cleared.
export async function unregisterForPush(token: string): Promise<void> {
  await unregisterDevice(token, Platform.OS);
}