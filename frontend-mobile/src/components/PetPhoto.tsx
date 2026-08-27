import { useState } from "react";
import { Alert, Image, Pressable, Text, View, type AlertButton } from "react-native";
import * as ImagePicker from "expo-image-picker";

import { usePets } from "@/context/PetContext";
import { uploadPhoto, deletePhoto } from "@/api/pets";
import type { Pet } from "@/types";
import type { PhotoUpload } from "@/api/records";

const BASE = process.env.EXPO_PUBLIC_API_URL;

type Props = {
  pet: Pet;
  size?: string;
  textSize?: string;
  interactive?: boolean;
};

// A pet's avatar. Same actions as the web's hover menu, driven by a native Alert instead — a
// phone has no hover state to reveal an overlay with.
export default function PetPhoto({
  pet,
  size = "h-14 w-14",
  textSize = "text-xl",
  interactive = true,
}: Props) {
  const { refresh } = usePets();
  const [busy, setBusy] = useState(false);

  async function upload(asset: ImagePicker.ImagePickerAsset) {
    const file: PhotoUpload = {
      uri: asset.uri,
      name: asset.fileName ?? "photo.jpg",
      type: asset.mimeType ?? "image/jpeg",
    };
    try {
      setBusy(true);
      await uploadPhoto(pet.id, file);
      await refresh();
    } catch (err) {
      Alert.alert("Upload failed", (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function pick() {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (!result.canceled) upload(result.assets[0]);
  }

  async function remove() {
    try {
      setBusy(true);
      await deletePhoto(pet.id);
      await refresh();
    } catch (err) {
      Alert.alert("Remove failed", (err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function openMenu() {
    const buttons: AlertButton[] = [{ text: "Choose photo", onPress: pick }];
    if (pet.photo_filename) {
      buttons.push({ text: "Remove", style: "destructive", onPress: remove });
    }
    buttons.push({ text: "Cancel", style: "cancel" });
    Alert.alert(`${pet.name}'s photo`, undefined, buttons);
  }

  const avatar = pet.photo_filename ? (
    <Image source={{ uri: `${BASE}/photos/${pet.photo_filename}` }} className={`${size} rounded-full`} />
  ) : (
    <View className={`${size} items-center justify-center rounded-full border border-border bg-surface`}>
      <Text className={`${textSize} font-bold text-fg`}>{pet.name.charAt(0).toUpperCase()}</Text>
    </View>
  );

  // In the pet selector the tap has to switch pets, so the avatar renders bare and the touch
  // falls through to the row that wraps it.
  if (!interactive) return avatar;

  return (
    <Pressable onPress={openMenu} disabled={busy} className="active:opacity-70">
      {avatar}
    </Pressable>
  );
}