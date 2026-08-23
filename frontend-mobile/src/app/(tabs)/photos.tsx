import { useCallback, useState } from "react";
import { Alert, Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";

import { usePets } from "@/context/PetContext";
import { listPetPhotos, deleteRecordPhoto } from "@/api/records";
import type { GalleryPhoto } from "@/types";
import { formatDate } from "@/dates";
import SwipeTabs from "@/components/SwipeTabs";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";

const BASE = process.env.EXPO_PUBLIC_API_URL;

export default function Photos() {
  const { currentPet } = usePets();
  const insets = useSafeAreaInsets();
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<GalleryPhoto | null>(null);

  const load = useCallback(async () => {
    if (!currentPet) {
      setPhotos([]);
      return;
    }
    setLoading(true);
    try {
      setPhotos(await listPetPhotos(currentPet.id));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentPet]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  function confirmDelete(photo: GalleryPhoto) {
    Alert.alert("Delete photo", "This photo will be permanently removed.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteRecordPhoto(photo.id);
          setSelected(null);
          load();
        },
      },
    ]);
  }

  if (!currentPet) {
    return (
      <View className="flex-1 items-center justify-center bg-ink px-6">
        <Text className="text-center text-muted">Add a pet first.</Text>
      </View>
    );
  }

  // Inside the lightbox a horizontal swipe moves between photos. The Modal covers the screen, so the tab swipe underneath is unreachable while it is open.
  const swipePhoto = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-20, 20])
    .failOffsetY([-20, 20])
    .onEnd((e) => {
      if (!selected) return;
      const i = photos.findIndex((p) => p.id === selected.id);
      if (i < 0) return;
      if (e.translationX < -50 && i < photos.length - 1) setSelected(photos[i + 1]);
      else if (e.translationX > 50 && i > 0) setSelected(photos[i - 1]);
    });
  
  return (
    <SwipeTabs>
    <ScrollView
      className="flex-1 bg-ink"
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16 }}
    >
      <Text className="mb-4 text-2xl font-bold text-fg">Photos</Text>

      {loading ? <Text className="text-muted">Loading…</Text> : null}

      {!loading && photos.length === 0 ? (
        <Text className="text-muted">
          No photos yet. Attach photos when you add a health record.
        </Text>
      ) : null}

      <View className="flex-row flex-wrap">
        {photos.map((p) => (
          <Pressable key={p.id} onPress={() => setSelected(p)} className="w-1/3 p-1">
            <Image
              source={{ uri: `${BASE}/photos/${p.filename}` }}
              className="aspect-square w-full rounded-lg border border-border"
            />
          </Pressable>
        ))}
      </View>

      <Modal
        visible={selected !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setSelected(null)}
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          <GestureDetector gesture={swipePhoto}>
            <Pressable
              onPress={() => setSelected(null)}
              className="flex-1 justify-center bg-black/90 p-4"
            >
          {selected ? (
            <Pressable onPress={() => {}}>
              <Image
                source={{ uri: `${BASE}/photos/${selected.filename}` }}
                resizeMode="contain"
                className="h-96 w-full"
              />

              <View className="mt-4 flex-row items-center justify-between">
                <Pressable
                  onPress={() => {
                    setSelected(null);
                    router.push("/records");
                  }}
                >
                  <Text className="text-primary">{selected.record_title}</Text>
                </Pressable>
                <Text className="text-muted">{formatDate(selected.record_date)}</Text>
              </View>

              <View className="mt-6 flex-row justify-between">
                <Pressable onPress={() => confirmDelete(selected)}>
                  <Text className="text-danger">Delete</Text>
                </Pressable>
                <Pressable onPress={() => setSelected(null)}>
                  <Text className="text-muted">Close</Text>
                </Pressable>
              </View>
            </Pressable>
          ) : null}
            </Pressable>
          </GestureDetector>
        </GestureHandlerRootView>
      </Modal>
    </ScrollView>
  </SwipeTabs>
  );
}