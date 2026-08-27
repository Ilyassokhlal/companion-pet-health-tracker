import { apiFetch } from "./client";
import type { Pet } from "../types";
import type { PhotoUpload } from "./records";
import { withCache } from "@/cache";

// Defines the types for creating and updating pets. PetCreate omits the id, user_id, and created_at fields from the Pet interface, while PetUpdate allows partial updates to a pet's information.
export type PetCreate = Omit<Pet, "id" | "user_id" | "created_at" | "photo_filename">;
export type PetUpdate = Partial<PetCreate>;

// Fetches a list of pets for the current user. Returns an array of pets.
export async function listPets(): Promise<Pet[]> {
  return apiFetch<Pet[]>("/pets");
}

// The user's pets, falling back to the last cached copy when offline.
export async function listPetsCached() {
  return withCache("pets", () => listPets());
}

// Creates a new pet with the provided data. Returns the created pet if successful.
export async function createPet(data: PetCreate): Promise<Pet> {
  return apiFetch<Pet>("/pets", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Fetches a pet by its ID. Returns the pet if found, or throws an error if not found.
export async function getPet(id: number): Promise<Pet> {
  return apiFetch<Pet>(`/pets/${id}`);
}

// Updates a pet by its ID. Returns the updated pet if successful.
export async function updatePet(id: number, data: PetUpdate): Promise<Pet> {
  return apiFetch<Pet>(`/pets/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// Deletes a pet by its ID. Returns void if successful.
export async function deletePet(id: number): Promise<void> {
  return apiFetch<void>(`/pets/${id}`, {
    method: "DELETE",
  });
}

// Uploads a photo for a pet by its ID. Returns the updated pet with the new photo filename.
// React Native has no File object, so the part is described by uri, name and type. The same shape uploadRecordPhotos uses.
export async function uploadPhoto(petId: number, file: PhotoUpload): Promise<Pet> {
  const formData = new FormData();
  formData.append("file", file as unknown as Blob);
  return apiFetch<Pet>(`/pets/${petId}/photo`, {
    method: "POST",
    body: formData,
  });
}

// Deletes a pet's photo by its ID. Returns the updated pet without the photo filename if successful.
export async function deletePhoto(petId: number): Promise<Pet> {
  return apiFetch<Pet>(`/pets/${petId}/photo`, { method: "DELETE" });
}