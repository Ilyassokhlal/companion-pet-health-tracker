import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { apiFetch, BASE_URL, getToken } from "./client";
import { withCache } from "../cache";
import type { GalleryPhoto, HealthRecord, RecordPhoto } from "../types";

// Type definitions for creating and updating health records. RecordCreate omits the id, pet_id, and created_at fields from HealthRecord, while RecordUpdate allows partial updates of RecordCreate.
export type RecordCreate = Omit<HealthRecord, "id" | "pet_id" | "created_at">;
export type RecordUpdate = Partial<RecordCreate>;

// Fetch all health records for a specific pet. This function sends a GET request to the API endpoint for the specified pet and returns an array of HealthRecord objects.
export async function listRecords(petId: number): Promise<HealthRecord[]> {
  return apiFetch<HealthRecord[]>(`/pets/${petId}/records`);
}

// Records for a pet, falling back to the last cached copy when offline.
export async function listRecordsCached(petId: number) {
  return withCache(`records:${petId}`, () => listRecords(petId));
}

// Create a new health record for a specific pet. This function sends a POST request to the API endpoint for the specified pet with the provided data.
export async function createRecord(petId: number, data: RecordCreate): Promise<HealthRecord> {
  return apiFetch<HealthRecord>(`/pets/${petId}/records`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Update a health record by its ID. This function sends a PATCH request to the API endpoint for the specified record with the provided data.
export async function updateRecord(recordId: number, data: RecordUpdate): Promise<HealthRecord> {
  return apiFetch<HealthRecord>(`/records/${recordId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// Delete a health record by its ID. This function sends a DELETE request to the API endpoint for the specified record.
export async function deleteRecord(recordId: number): Promise<void> {
  return apiFetch<void>(`/records/${recordId}`, {
    method: "DELETE",
  });
}

// A local image to upload. React Native has no File object, so multipart parts are
// described by uri, name and type instead.
export type PhotoUpload = { uri: string; name: string; type: string };

// Upload multiple photos for a health record. Returns an array of RecordPhoto objects.
export async function uploadRecordPhotos(
  recordId: number,
  files: PhotoUpload[],
): Promise<RecordPhoto[]> {
  const form = new FormData();
  for (const file of files) {
    form.append("files", file as unknown as Blob);
  }
  return apiFetch<RecordPhoto[]>(`/records/${recordId}/photos`, { method: "POST", body: form });
}

  // Delete a photo associated with a health record. This function sends a DELETE request to the API endpoint for the specified photo.
export async function deleteRecordPhoto(photoId: number): Promise<void> {
  return apiFetch<void>(`/record-photos/${photoId}`, { method: "DELETE" });
}

// List all photos associated with a specific pet. This function sends a GET request to the API endpoint for the specified pet and returns an array of GalleryPhoto objects.
export async function listPetPhotos(petId: number): Promise<GalleryPhoto[]> {
  return apiFetch<GalleryPhoto[]>(`/pets/${petId}/photos`);
}

// Download a pet's records and hand the file to another app. On mobile a download is not a download: the file is written to the cache directory and then offered to the share sheet.
export async function exportRecords(petId: number, format: "zip" | "pdf"): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing is not available on this device.");
  }

  const token = await getToken();
  const destination = new File(Paths.cache, format === "zip" ? "companion-export.zip" : "records.pdf");
  if (destination.exists) {
    destination.delete();
  }

  const task = File.createDownloadTask(
    `${BASE_URL}/pets/${petId}/export?format=${format}`,
    destination,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const downloaded = await task.downloadAsync();
  if (!downloaded) {
    throw new Error("Download failed.");
  }

  await Sharing.shareAsync(downloaded.uri, {
    mimeType: format === "zip" ? "application/zip" : "application/pdf",
    dialogTitle: "Export records",
  });
}

// Lazily import the media library module to handle cases where it is not available on the device. This allows the app to fall back to the share sheet instead of throwing an error at import time.
let mediaLibrary: typeof import("expo-media-library") | null | undefined;

async function getMediaLibrary() {
  if (mediaLibrary === undefined) {
    try {
      mediaLibrary = await import("expo-media-library");
    } catch {
      mediaLibrary = null;
    }
  }
  return mediaLibrary;
}

// Save a single photo to the media library or share it via the system share sheet if the media library is unavailable. Returns "saved" if the photo was saved to the library, or "shared" if it was shared.
export async function savePhotoToLibrary(photo: GalleryPhoto): Promise<"saved" | "shared"> {
  const extension = photo.filename.slice(photo.filename.lastIndexOf("."));
  const destination = new File(Paths.cache, `${photo.record_date}-${photo.id}${extension}`);
  if (destination.exists) {
    destination.delete();
  }

  const task = File.createDownloadTask(`${BASE_URL}/photos/${photo.filename}`, destination);
  const downloaded = await task.downloadAsync();
  if (!downloaded) {
    throw new Error("Download failed.");
  }

  const library = await getMediaLibrary();
  if (library) {
    // Request the necessary permission to save photos to the media library.
    const permission = await library.requestPermissionsAsync(true, ["photo"]);
    if (!permission.granted) {
      throw new Error("Companion needs permission to save to your photos.");
    }
    // Save the downloaded photo to the media library.
    await library.Asset.create(downloaded.uri);
    return "saved";
  }

  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing is not available on this device.");
  }
  await Sharing.shareAsync(downloaded.uri, { dialogTitle: "Save photo" });
  return "shared";
}

// Download multiple photos as a zip file and share it via the system share sheet. This is used for bulk downloads since the media library only accepts individual media files. The endpoint requires authentication.
export async function downloadPhotos(petId: number, ids: number[]): Promise<void> {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing is not available on this device.");
  }

  const token = await getToken();
  const destination = new File(Paths.cache, "photos.zip");
  if (destination.exists) {
    destination.delete();
  }

  const query = ids.map((id) => `ids=${id}`).join("&");
  const task = File.createDownloadTask(
    `${BASE_URL}/pets/${petId}/photos/download?${query}`,
    destination,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const downloaded = await task.downloadAsync();
  if (!downloaded) {
    throw new Error("Download failed.");
  }

  await Sharing.shareAsync(downloaded.uri, {
    mimeType: "application/zip",
    dialogTitle: "Save photos",
  });
}