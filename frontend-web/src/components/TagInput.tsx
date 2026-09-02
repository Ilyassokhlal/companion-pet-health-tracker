import { useState } from "react";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import Input from "./ui/Input";
import Button from "./ui/Button";

interface Props {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

// A list of short text entries, added one at a time and shown as removable chips.
// Each entry is limited to 100 characters instead of getting 422-ed on save.
export default function TagInput({ label, values, onChange, placeholder }: Props) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState("");

  function add() {
    const entry = draft.trim();
    if (!entry || values.includes(entry)) {
      setDraft("");
      return;
    }
    onChange([...values, entry]);
    setDraft("");
  }

  return (
    <div>
      <label className="block mb-1">{label}</label>
      <div className="flex gap-2">
        <Input
          type="text"
          value={draft}
          maxLength={100}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              // This sits inside the pet form. Without preventDefault, Enter submits the whole form instead of adding an entry.
              e.preventDefault();
              add();
            }
          }}
        />
        <Button type="button" variant="secondary" onClick={add} className="shrink-0">
          {t("tagInput.add")}
        </Button>
      </div>
      {values.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {values.map((value) => (
            <li
              key={value}
              className="inline-flex items-center gap-1.5 rounded-full bg-ink border border-border px-3 py-1 text-sm"
            >
              {value}
              <button
                type="button"
                onClick={() => onChange(values.filter((v) => v !== value))}
                aria-label={t("tagInput.remove", { value })}
                className="text-muted hover:text-danger"
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}