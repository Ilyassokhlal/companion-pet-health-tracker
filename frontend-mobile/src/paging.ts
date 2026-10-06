import { useCallback, useEffect, useRef, useState } from "react";
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { useFocusEffect } from "expo-router";

// The longest page the server sends
const MAX_PAGE = 100;

// How close to the end of a list, in points, the next page starts loading
const NEAR_END = 600;

// What a list asks the server for: `limit` items, skipping the `offset` already shown.
export type PageFetcher<T> = (offset: number, limit: number) => Promise<T[]>;

// The items on screen, and the fetcher they came from. A list only counts as loaded for the fetcher that produced it.
interface Loaded<T> {
  source: PageFetcher<T> | null;
  items: T[];
  hasMore: boolean;
}

// Shared by every list that has nothing to show yet, so its identity never changes
const NOTHING: never[] = [];

// A list the server sends a page at a time. fetchPage is null while there is nothing to load, such as before a pet exists,
// and a new fetchPage, after a filter or the pet changes, starts the list again from its first page.
export function usePaged<T extends { id: number }>(fetchPage: PageFetcher<T> | null, pageSize: number) {
  const [list, setList] = useState<Loaded<T>>({ source: null, items: NOTHING, hasMore: false });
  const [loadingMore, setLoadingMore] = useState(false);
  // Set while a next page is on its way, so a second scroll can't ask for the same page twice
  const busy = useRef(false);

  useEffect(() => {
    if (!fetchPage) return;
    // Set once the list has started over again, so a first page arriving late is thrown away
    let replaced = false;
    fetchPage(0, pageSize)
      .then((rows) => {
        if (!replaced) setList({ source: fetchPage, items: rows, hasMore: rows.length === pageSize });
      })
      .catch((err) => {
        console.error(err);
        // Nothing from the list before, such as another filter, may stay up as this one
        if (!replaced) setList({ source: fetchPage, items: NOTHING, hasMore: false });
      });
    return () => {
      replaced = true;
    };
  }, [fetchPage, pageSize]);

  // Until the first page for this fetcher arrives, the list is loading and shows nothing
  const current = fetchPage !== null && list.source === fetchPage;
  const items: T[] = current ? list.items : NOTHING;
  const loading = fetchPage !== null && !current;
  const hasMore = current && list.hasMore;

  const loadMore = useCallback(async () => {
    if (!fetchPage || !hasMore || busy.current) return;
    busy.current = true;
    setLoadingMore(true);
    try {
      const rows = await fetchPage(items.length, pageSize);
      setList((shown) => {
        // A page that arrives after the list started over belongs to the old one
        if (shown.source !== fetchPage) return shown;
        // Something added or deleted on another device can shift a page by one, so anything already shown is skipped
        const ids = new Set(shown.items.map((item) => item.id));
        return { source: fetchPage, items: [...shown.items, ...rows.filter((row) => !ids.has(row.id))], hasMore: rows.length === pageSize };
      });
    } catch (err) {
      console.error(err);
    } finally {
      busy.current = false;
      setLoadingMore(false);
    }
  }, [fetchPage, hasMore, items.length, pageSize]);

  // After an add, edit or delete: fetch again everything shown so far, so the reader stays where they are in the list
  const refresh = useCallback(async () => {
    if (!fetchPage) return;
    const wanted = Math.max(items.length, pageSize);
    try {
      const rows: T[] = [];
      for (let offset = 0; offset < wanted; offset += MAX_PAGE) {
        const limit = Math.min(MAX_PAGE, wanted - offset);
        const chunk = await fetchPage(offset, limit);
        rows.push(...chunk);
        if (chunk.length < limit) break;
      }
      setList((shown) => (shown.source === fetchPage ? { source: fetchPage, items: rows, hasMore: rows.length >= wanted } : shown));
    } catch (err) {
      console.error(err);
    }
  }, [fetchPage, items.length, pageSize]);

  return { items, loading, loadingMore, hasMore, loadMore, refresh };
}

// Coming back to a screen fetches again what it shows, so a change made on another screen appears without losing the reader's place.
// The first focus is skipped, since the list is already loading then.
export function useRefreshOnFocus(refresh: () => void) {
  const latest = useRef(refresh);
  const focusedBefore = useRef(false);

  useEffect(() => {
    latest.current = refresh;
  });

  useFocusEffect(
    useCallback(() => {
      if (focusedBefore.current) latest.current();
      focusedBefore.current = true;
    }, []),
  );
}

// Props for the ScrollView holding a list that loads in pages: the next page loads as the reader nears the end,
// and straight away when a page is too short to scroll.
export function useLoadOnScroll(loadMore: () => void) {
  const viewport = useRef(0);
  return {
    scrollEventThrottle: 200,
    onLayout: (event: LayoutChangeEvent) => {
      viewport.current = event.nativeEvent.layout.height;
    },
    onContentSizeChange: (_width: number, height: number) => {
      if (viewport.current > 0 && height < viewport.current + NEAR_END) loadMore();
    },
    onScroll: ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
      if (layoutMeasurement.height + contentOffset.y >= contentSize.height - NEAR_END) loadMore();
    },
  };
}
