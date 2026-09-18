import type { RecordPhoto } from "../types";

interface Props {
  photo: Pick<RecordPhoto, "filename" | "thumbnail">;
  className?: string;
}

// The small copy the server makes on upload. A photo stored before thumbnails existed has none until the backfill
// runs, so a missing thumbnail falls back to the full image once.
export default function PhotoThumb({ photo, className }: Props) {
  const base = `${import.meta.env.VITE_API_URL}/photos`;
  return (
    <img
      src={`${base}/${photo.thumbnail}`}
      alt=""
      loading="lazy"
      onError={(e) => {
        const img = e.currentTarget;
        if (img.dataset.fallback) return;
        img.dataset.fallback = "1";
        img.src = `${base}/${photo.filename}`;
      }}
      className={className}
    />
  );
}
