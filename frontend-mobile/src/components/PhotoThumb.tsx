import { useState } from "react";
import { Image } from "react-native";

import type { RecordPhoto } from "@/types";

const BASE = process.env.EXPO_PUBLIC_API_URL;

interface Props {
  photo: Pick<RecordPhoto, "filename" | "thumbnail">;
  className?: string;
}

// The small copy the server makes on upload. A photo stored before thumbnails existed has none until the backfill
// runs, so a missing thumbnail falls back to the full image once. resizeMethod="resize" makes Android decode at the
// square's size: by default it only does that for local files, so a remote photo was decoded at full resolution.
export default function PhotoThumb({ photo, className }: Props) {
  const [name, setName] = useState(photo.thumbnail);
  return (
    <Image
      source={{ uri: `${BASE}/photos/${name}` }}
      resizeMethod="resize"
      onError={() => {
        if (name !== photo.filename) setName(photo.filename);
      }}
      className={className}
    />
  );
}
