import { useCallback, useEffect, useRef, useState } from "react";

// The longest page the server sends
const MAX_PAGE = 100;

// What a list asks the server for: `limit` items, skipping the `offset` already shown.
export type PageFetcher<T> = (offset: number, limit: number) => Promise<T[]>;

// A list the server sends a page at a time. fetchPage is null while there is nothing to load, such as before a pet exists,
// and a new fetchPage, after a filter or the pet changes, starts the list again from its first page.
export function usePaged<T extends { id: number }>(fetchPage: PageFetcher<T> | null, pageSize: number) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  // Counts every fresh start, so a page still on its way from before one is thrown away
  const run = useRef(0);
  // Set while a next page is on its way, so a second scroll can't ask for the same page twice
  const busy = useRef(false);

  const reload = useCallback(async () => {
    const current = ++run.current;
    busy.current = false;
    setLoadingMore(false);
    if (!fetchPage) {
      setItems([]);
      setHasMore(false);
      return;
    }
    setLoading(true);
    try {
      const rows = await fetchPage(0, pageSize);
      if (current !== run.current) return;
      setItems(rows);
      setHasMore(rows.length === pageSize);
    } catch (err) {
      console.error(err);
    } finally {
      if (current === run.current) setLoading(false);
    }
  }, [fetchPage, pageSize]);

  const loadMore = useCallback(async () => {
    if (!fetchPage || !hasMore || loading || busy.current) return;
    const current = run.current;
    busy.current = true;
    setLoadingMore(true);
    try {
      const rows = await fetchPage(items.length, pageSize);
      if (current !== run.current) return;
      // Something added or deleted on another device can shift a page by one, so anything already shown is skipped
      setItems((shown) => {
        const ids = new Set(shown.map((item) => item.id));
        return [...shown, ...rows.filter((row) => !ids.has(row.id))];
      });
      setHasMore(rows.length === pageSize);
    } catch (err) {
      console.error(err);
    } finally {
      if (current === run.current) {
        busy.current = false;
        setLoadingMore(false);
      }
    }
  }, [fetchPage, hasMore, loading, items.length, pageSize]);

  // After an add, edit or delete: fetch again everything shown so far, so the reader stays where they are in the list
  const refresh = useCallback(async () => {
    if (!fetchPage) return;
    const current = ++run.current;
    busy.current = false;
    const wanted = Math.max(items.length, pageSize);
    try {
      const rows: T[] = [];
      for (let offset = 0; offset < wanted; offset += MAX_PAGE) {
        const limit = Math.min(MAX_PAGE, wanted - offset);
        const chunk = await fetchPage(offset, limit);
        rows.push(...chunk);
        if (chunk.length < limit) break;
      }
      if (current !== run.current) return;
      setItems(rows);
      setHasMore(rows.length >= wanted);
      setLoadingMore(false);
    } catch (err) {
      console.error(err);
    }
  }, [fetchPage, items.length, pageSize]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { items, loading, loadingMore, hasMore, loadMore, refresh };
}
