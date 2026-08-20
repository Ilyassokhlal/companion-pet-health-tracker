import { apiFetch } from "./client";
import type { GalleryPhoto, HealthRecord, RecordPhoto } from "../types";

// Type definitions for creating and updating health records. RecordCreate omits the id, pet_id, and created_at fields from HealthRecord, while RecordUpdate allows partial updates of RecordCreate.
export type RecordCreate = Omit<HealthRecord, "id" | "pet_id" | "created_at">;
export type RecordUpdate = Partial<RecordCreate>;

// Fetch all health records for a specific pet. This function sends a GET request to the API endpoint for the specified pet and returns an array of HealthRecord objects.
export async function listRecords(petId: number): Promise<HealthRecord[]> {
  return apiFetch<HealthRecord[]>(`/pets/${petId}/records`);
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