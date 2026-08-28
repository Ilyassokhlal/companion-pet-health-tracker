import { useCallback, useMemo, useState } from "react";
import { Alert, Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";

import { usePets } from "@/context/PetContext";
import { listPetPhotos, deleteRecordPhoto } from "@/api/records";
import { RECORD_TYPES } from "@/types";
import type { GalleryPhoto, RecordType } from "@/types";
import { formatDateLong } from "@/dates";
import { useTheme } from "@/theme/ThemeContext";
import { themeColors } from "@/theme/palette";
import DateField from "@/components/ui/DateField";
import SwipeTabs from "@/components/SwipeTabs";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";

const BASE = process.env.EXPO_PUBLIC_API_URL;

export default function Photos() {
  const { t } = useTranslation();
  const { currentPet } = usePets();
  const { theme, accent } = useTheme();
  const insets = useSafeAreaInsets();
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<GalleryPhoto | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [types, setTypes] = useState<RecordType[]>([]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

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

  // Same derivation as the web gallery: one fetch, filtered and bucketed by month in memory. Dates
  // compare as ISO strings, and the server orders by record date descending, so the months come out
  // newest-first without any sorting.
  const months = useMemo(() => {
    const byMonth = new Map<string, GalleryPhoto[]>();
    for (const p of photos) {
      if (types.length > 0 && !types.includes(p.record_type)) continue;
      if (from && p.record_date < from) continue;
      if (to && p.record_date > to) continue;
      const key = p.record_date.slice(0, 7);
      const bucket = byMonth.get(key);
      if (bucket) bucket.push(p);
      else byMonth.set(key, [p]);
    }
    return [...byMonth];
  }, [photos, types, from, to]);

  // The lightbox swipes through what is on screen, not the unfiltered list.
  const visible = useMemo(() => months.flatMap(([, items]) => items), [months]);

  const activeFilters = types.length + (from ? 1 : 0) + (to ? 1 : 0);

  function toggleType(type: RecordType) {
    setTypes((current) =>
      current.includes(type) ? current.filter((x) => x !== type) : [...current, type],
    );
  }

  function clearFilters() {
    setTypes([]);
    setFrom("");
    setTo("");
  }

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
        <Text className="text-center text-muted">{t("photos.noPet")}</Text>
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
      const i = visible.findIndex((p) => p.id === selected.id);
      if (i < 0) return;
      if (e.translationX < -50 && i < visible.length - 1) setSelected(visible[i + 1]);
      else if (e.translationX > 50 && i > 0) setSelected(visible[i - 1]);
    });

  // Three fixed children come before the month sections, and each month contributes exactly two, so
  // the sticky indices are arithmetic. The filter panel and the status line always render as a View
  // even when empty, because a conditional child would shift every index below it.
  const stickyIndices = months.map((_, i) => 3 + i * 2);
  const colors = themeColors(theme, accent);
  const filterActive = filtersOpen || activeFilters > 0;

  return (
    <SwipeTabs>
    <ScrollView
      className="flex-1 bg-ink"
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: 16 }}
      stickyHeaderIndices={stickyIndices}
    >
      <View className="flex-row items-center justify-between px-4 pb-4">
        <Text className="text-2xl font-bold text-fg">{t("photos.title")}</Text>
        <Pressable
          onPress={() => setFiltersOpen(!filtersOpen)}
          className={`flex-row items-center gap-2 rounded-lg px-3 py-1.5 ${filterActive ? "bg-primary" : "border border-border bg-surface"}`}
        >
          <Ionicons
            name="options-outline"
            size={16}
            color={filterActive ? colors.onPrimary : colors.muted}
          />
          <Text className={`text-sm ${filterActive ? "text-on-primary" : "text-muted"}`}>
            {t("photos.filter")}{activeFilters > 0 ? ` (${activeFilters})` : ""}
          </Text>
        </Pressable>
      </View>

      <View className="px-4">
        {filtersOpen ? (
          <View className="mb-4 rounded-xl border border-border bg-surface p-4">
            <Text className="mb-2 text-sm font-medium text-fg">{t("photos.type")}</Text>
            <View className="flex-row flex-wrap gap-2">
              {RECORD_TYPES.map((type) => (
                <Pressable
                  key={type}
                  onPress={() => toggleType(type)}
                  className={`rounded-lg px-3 py-1.5 ${types.includes(type) ? "bg-primary" : "border border-border bg-ink"}`}
                >
                  <Text className={`text-sm ${types.includes(type) ? "text-on-primary" : "text-muted"}`}>
                    {type}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View className="mt-4 gap-3">
              <DateField label={t("photos.from")} value={from} onChange={setFrom} clearable />
              <DateField label={t("photos.to")} value={to} onChange={setTo} clearable />
            </View>

            {activeFilters > 0 ? (
              <Pressable onPress={clearFilters} className="mt-3 self-start">
                <Text className="text-sm text-primary">{t("photos.clearFilters")}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>

      <View className="px-4">
        {loading ? <Text className="text-muted">{t("common.loading")}</Text> : null}
        {!loading && photos.length === 0 ? (
          <Text className="text-muted">{t("photos.empty")}</Text>
        ) : null}
        {!loading && photos.length > 0 && months.length === 0 ? (
          <Text className="text-muted">{t("photos.noMatch")}</Text>
        ) : null}
      </View>

      {months.flatMap(([key, items]) => [
        <Text
          key={`h-${key}`}
          className="bg-ink px-4 py-2 text-sm font-semibold text-muted"
        >
          {new Date(`${key}-01T00:00:00`).toLocaleDateString(undefined, {
            month: "long",
            year: "numeric",
          })}
        </Text>,
        <View key={`g-${key}`} className="flex-row flex-wrap px-3 pb-4">
          {items.map((p) => (
            <Pressable key={p.id} onPress={() => setSelected(p)} className="w-1/3 p-1">
              <Image
                source={{ uri: `${BASE}/photos/${p.filename}` }}
                className="aspect-square w-full rounded-lg border border-border"
              />
            </Pressable>
          ))}
        </View>,
      ])}

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

              <View className="mt-4 rounded-xl border border-border bg-surface px-4 py-3">
                <View className="flex-row items-center justify-between gap-3">
                  <Pressable
                    className="shrink"
                    onPress={() => {
                      setSelected(null);
                      router.push("/records");
                    }}
                  >
                    <Text numberOfLines={1} className="font-semibold text-fg">
                      {selected.record_title}
                    </Text>
                  </Pressable>
                  <Text className="shrink-0 text-sm text-muted">
                    {formatDateLong(selected.record_date)}
                  </Text>
                </View>

                <View className="mt-4 flex-row items-center justify-between">
                  <Pressable
                    onPress={() => confirmDelete(selected)}
                    className="flex-row items-center gap-1.5 rounded-lg py-2"
                  >
                    <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    <Text className="text-sm font-medium text-danger">{t("common.delete")}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setSelected(null)}
                    className="rounded-lg border border-border px-4 py-2"
                  >
                    <Text className="text-sm font-medium text-fg">{t("common.close")}</Text>
                  </Pressable>
                </View>
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