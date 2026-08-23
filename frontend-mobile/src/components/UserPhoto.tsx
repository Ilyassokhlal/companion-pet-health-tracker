import { useState } from "react";
import { Alert, Image, Pressable, Text, View, type AlertButton } from "react-native";
import * as ImagePicker from "expo-image-picker";

import { useAuth } from "@/auth/AuthContext";
import { uploadMyPhoto, deleteMyPhoto } from "@/api/auth";
import type { PhotoUpload } from "@/api/records";

const BASE = process.env.EXPO_PUBLIC_API_URL;

// The signed-in user's avatar. Same actions as the web's hover menu, but driven by a native Alert
// A phone has no hover state to reveal an overlay with.
export default function UserPhoto() {
  const { user, refreshUser } = useAuth();
  const [busy, setBusy] = useState(false);

  async function upload(asset: ImagePicker.ImagePickerAsset) {
    const file: PhotoUpload = {
      uri: asset.uri,
      name: asset.fileName ?? "photo.jpg",
      type: asset.type ?? "image/jpeg",
    };
    try {
      setBusy(true);
      await uploadMyPhoto(file);
      await refreshUser();
    } catch (err) {
      Alert.alert("Upload failed", (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function pick() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (!result.canceled) upload(result.assets[0]);
    return result;
  }

  async function remove() {
    try {
      setBusy(true);
      await deleteMyPhoto();
      await refreshUser();
    } catch (err) {
      Alert.alert("Remove failed", (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function openMenu() {
    const buttons: AlertButton[] = [{ text: "Choose photo", onPress: pick }];
    if (user?.photo_filename) {
      buttons.push({ text: "Remove", style: "destructive", onPress: remove });
    }
    buttons.push({ text: "Cancel", style: "cancel" });
    Alert.alert("Profile photo", undefined, buttons);
  }

  if (!user) return null;

  return (
    <View className="items-center">

      <Pressable onPress={openMenu} disabled={busy}>
        {user.photo_filename ? (
          <Image source={{ uri: `${BASE}/photos/${user.photo_filename}` }} className="h-24 w-24 rounded-full" />
        ) : (
          <View className="h-24 w-24 items-center justify-center rounded-full border border-border bg-surface">
            <Text className="text-2xl font-bold text-fg">{user.username.charAt(0).toUpperCase()}</Text>
          </View>
        )}
      </Pressable>
      <Text className="mt-2 text-sm text-primary">Change photo</Text>
    </View>
  );
}
    