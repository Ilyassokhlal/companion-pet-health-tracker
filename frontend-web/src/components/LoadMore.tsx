import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

// Sits under a list that loads in pages. Once it comes near the screen the next page loads, so scrolling down keeps the list going.
export default function LoadMore({ hasMore, loading, onLoad }: { hasMore: boolean; loading: boolean; onLoad: () => void }) {
  const { t } = useTranslation();
  const marker = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = marker.current;
    if (!node || !hasMore || loading) return;
    // Watching starts over after every page, so a page too short to fill the screen still pulls in the next one
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onLoad();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, loading, onLoad]);

  if (!hasMore) return null;
  return (
    <div ref={marker} className="py-4 text-center text-sm text-muted">
      {loading ? t("common.loading") : null}
    </div>
  );
}
