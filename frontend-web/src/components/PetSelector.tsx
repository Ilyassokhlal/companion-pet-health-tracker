import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePets } from "../context/PetContext";
import { Check, ChevronDown, Plus } from "lucide-react";
import type { Pet } from "../types";

// Renders a pet's photo as a circle, falling back to the first letter of its name.
function Avatar({ pet, size }: { pet: Pet; size: number }) {
  return pet.photo_filename ? (
    <img
      src={`${import.meta.env.VITE_API_URL}/photos/${pet.photo_filename}`}
      alt={pet.name}
      className={`rounded-full object-cover ring-1 ring-border shrink-0`}
      style={{ width: size, height: size }}
    />
  ) : (
    <div
      className={`rounded-full bg-muted text-fg flex items-center justify-center ring-1 ring-border shrink-0`}
      style={{ width: size, height: size }}
    >
      {pet.name.charAt(0).toUpperCase()}
    </div>
  );
}

// Dropdown that shows the active pet and switches between pets. Replaces the
export default function PetSelector() {
  const { t } = useTranslation();
  const { pets, currentPet, setCurrentPet, setAddPetOpen } = usePets();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close the panel on an outside click and on Escape.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Select a pet and close the panel.
  const choose = (pet: Pet) => {
    setCurrentPet(pet);
    setOpen(false);
  };

  // Open the add-pet modal from the last row of the panel.
  const addPet = () => {
    setOpen(false);
    setAddPetOpen(true);
    navigate("/dashboard");
  };

  if (pets.length === 0) return null;

  return (
    <div ref={containerRef} className="relative shrink-0">
      {
        currentPet && (
          <button
            type="button"
            className="inline-flex items-center gap-2 min-w-[12rem] max-w-72 sm:max-w-96 bg-ink text-fg border border-border rounded-lg px-3 py-1.5 hover:border-primary transition"
            aria-haspopup="listbox"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <Avatar pet={currentPet} size={24} />
            <span title={currentPet.name} className="truncate min-w-0 flex-1 text-center">{currentPet.name}</span>
            <ChevronDown size={16} className="shrink-0 text-muted" />
          </button>
        )
      }

      {open && (
        <div className="absolute inset-x-0 mt-2 z-50 bg-surface border border-border rounded-lg shadow-lg">
          {pets.map((pet) => (
            <button
              key={pet.id}
              type="button"
              className="flex items-center gap-2 w-full px-4 py-2 hover:bg-muted"
              onClick={() => choose(pet)}
            >
              <Avatar pet={pet} size={32} />
              <div className="flex min-w-0 flex-1 flex-col text-center">
                <span className="truncate" title={pet.name}>{pet.name}</span>
                <span className="text-xs text-muted">{pet.species}</span>
              </div>
              <span className="w-8 shrink-0">{pet.id === currentPet?.id && <Check size={16} />}</span>
            </button>
          ))}
          <div className="border-t border-border">
            <button
              type="button"
              className="flex items-center gap-2 w-full px-4 py-2 hover:bg-muted"
              onClick={addPet}
            >
              <Plus size={16} />
              {t("petSelector.addPet")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}