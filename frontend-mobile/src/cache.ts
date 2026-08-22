import AsyncStorage from "@react-native-async-storage/async-storage";

// Everything this module writes is namespaced, so clearing the cache can never touch the auth token
// or anything else stored on the device.
const PREFIX = "cache:";

// Stored alongside the payload so the UI can say how stale the data is.
export interface Entry<T> {
  savedAt: string; // ISO timestamp
  data: T;
}

// Writes a value. Failures are swallowed on purpose — a cache write must never break the request that produced the data.
export async function writeCache<T>(key: string, data: T): Promise<void> {
  try {
    const entry: Entry<T> = {
      savedAt: new Date().toISOString(),
      data,
    };
    await AsyncStorage.setItem(PREFIX + key, JSON.stringify(entry));
  } catch {
    // ignored on purpose
  }
}

// Reads a value, or null when nothing is cached or the entry can't be parsed.
export async function readCache<T>(key: string): Promise<Entry<T> | null> {
  try {
    const item = await AsyncStorage.getItem(PREFIX + key);
    if (!item) return null;
    return JSON.parse(item) as Entry<T>;
  } catch {
    return null;
  }
}

// Drops everything this module owns. Call on logout.
export async function clearCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter((key) => key.startsWith(PREFIX));
    if (cacheKeys.length > 0) {
      await AsyncStorage.multiRemove(cacheKeys);
    }
  } catch {
    // ignored on purpose
  }
}

// Fetches over the network and caches the result. On failure, falls back to the last
// cached value. savedAt is null when the data is fresh, and set when it came from cache.
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<{ data: T; savedAt: string | null }> {
  try {
    const data = await fetcher();
    await writeCache(key, data);
    return { data, savedAt: null };
  } catch (err) {
    const entry = await readCache<T>(key);
    if (!entry) throw err;
    return { data: entry.data, savedAt: entry.savedAt };
  }
}