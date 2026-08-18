import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import type { Pet } from "../types";
import { listPets } from "../api/pets";
import { useAuth } from "../auth/AuthContext";

// PetState interface defines the shape of the context value
interface PetState {
  pets: Pet[];
  currentPet: Pet | null;
  setCurrentPet: (pet: Pet) => void;
  refresh: () => Promise<void>;
  loading: boolean;
  addPetOpen: boolean;
  setAddPetOpen: (open: boolean) => void;
}

// PetProvider component that manages the state of pets and provides it to its children via context.
export function PetProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const [pets, setPets] = useState<Pet[]>([]);
    const [currentPet, setCurrentPet] = useState<Pet | null>(null);
    const [loading, setLoading] = useState(true);
    const [addPetOpen, setAddPetOpen] = useState(false);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const data = await listPets();
            setPets(data);
            const savedId = Number(localStorage.getItem("currentPetId"));
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
            setLoading(false);
            return;
        }
        refresh();
    }, [user, refresh]);

    function selectPet(pet: Pet) {
        setCurrentPet(pet);
        localStorage.setItem("currentPetId", String(pet.id));
    }

    return (
        <PetContext.Provider value={{ pets, currentPet, setCurrentPet: selectPet, refresh, loading, addPetOpen, setAddPetOpen }}>
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

const PetContext = createContext<PetState | undefined>(undefined);