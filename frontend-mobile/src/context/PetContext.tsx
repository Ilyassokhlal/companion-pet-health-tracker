import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import * as SecureStore from "expo-secure-store";

import type { Pet } from "@/types";
import { listPetsCached } from "@/api/pets";
import { useAuth } from "@/auth/AuthContext";

const CURRENT_PET_KEY = "currentPetId";

interface PetState {
  pets: Pet[];
  currentPet: Pet | null;
  setCurrentPet: (pet: Pet) => void;
  refresh: (silent?: boolean) => Promise<void>;
  loading: boolean;
  addPetOpen: boolean;
  setAddPetOpen: (open: boolean) => void;
  offlineSince: string | null;
}

const PetContext = createContext<PetState | undefined>(undefined);

export function PetProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [pets, setPets] = useState<Pet[]>([]);
  const [currentPet, setCurrentPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);
  const [addPetOpen, setAddPetOpen] = useState(false);
  const [offlineSince, setOfflineSince] = useState<string | null>(null);

  // Refreshes the list of pets from the server, optionally skipping the loading indicator if `silent` is true. Updates the local state with the latest pets and the current pet selection. Persists the current pet selection in secure storage.
  const refresh = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data, savedAt } = await listPetsCached();
      setPets(data);
      setOfflineSince(savedAt);
      const savedId = Number(await SecureStore.getItemAsync(CURRENT_PET_KEY));
      const saved = data.find((pet) => pet.id === savedId);
      setCurrentPet(saved ?? data[0] ?? null);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setPets([]);
      setCurrentPet(null);
      setOfflineSince(null);
      setLoading(false);
      return;
    }
    refresh();
  }, [user, refresh]);

  async function selectPet(pet: Pet) {
    setCurrentPet(pet);
    await SecureStore.setItemAsync(CURRENT_PET_KEY, String(pet.id));
  }

  return (
    <PetContext.Provider
      value={{ pets, currentPet, setCurrentPet: selectPet, refresh, loading, addPetOpen, setAddPetOpen, offlineSince }}
    >
      {children}
    </PetContext.Provider>
  );
}

export function usePets(): PetState {
  const context = useContext(PetContext);
  if (!context) {
    throw new Error("usePets must be used within a PetProvider");
  }
  return context;
}