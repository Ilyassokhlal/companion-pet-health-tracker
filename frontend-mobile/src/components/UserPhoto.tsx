import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Image, Pressable, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";

import { useAuth } from "@/auth/AuthContext";
import { uploadMyPhoto, deleteMyPhoto } from "@/api/auth";
import { useDialog, type Choice } from "@/components/ui/DialogProvider";
import type { PhotoUpload } from "@/api/records";
import { errorMessage } from "@/errors";

const BASE = process.env.EXPO_PUBLIC_API_URL;

// The signed-in user's avatar. Same actions as the web's hover menu, but driven by a themed sheet.
// A phone has no hover state to reveal an overlay with.
export default function UserPhoto() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const { choose, notice } = useDialog();
  const [busy, setBusy] = useState(false);

  async function upload(asset: ImagePicker.ImagePickerAsset) {
    const file: PhotoUpload = {
      uri: asset.uri,
      name: asset.fileName ?? "photo.jpg",
      type: asset.mimeType ?? "image/jpeg",
    };
    try {
      setBusy(true);
      await uploadMyPhoto(file);
      await refreshUser();
    } catch (err) {
      notice(t("photoMenu.uploadFailed"), errorMessage(err));
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
      notice(t("photoMenu.removeFailed"), errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  // The actions array runs parallel to the choices, so the index the sheet returns needs no arithmetic and the trailing Cancel simply has nothing to run.
  async function openMenu() {
    const actions: (() => void)[] = [pick];
    const choices: Choice[] = [{ label: t("photoMenu.choose") }];
    if (user?.photo_filename) {
      choices.push({ label: t("photoMenu.remove"), variant: "danger" });
      actions.push(remove);
    }
    choices.push({ label: t("common.cancel"), variant: "secondary" });
    const picked = await choose(t("photoMenu.userTitle"), choices);
    if (picked !== null) actions[picked]?.();
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
      <Text className="mt-2 text-sm text-primary">{t("photoMenu.change")}</Text>
    </View>
  );
}