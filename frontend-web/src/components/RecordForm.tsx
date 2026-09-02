import { useState } from "react";
import { useTranslation } from "react-i18next";
import { createRecord, updateRecord, uploadRecordPhotos } from "../api/records";
import { RECORD_TYPES } from "../types";
import type { HealthRecord, RecordType } from "../types";
import { useAuth } from "../auth/AuthContext";
import { fromKg, toKg, weightUnit } from "../units";
import { errorMessage } from "../errors";
import Button from "./ui/Button";
import Input from "./ui/Input";

interface Props {
  petId: number;
  record?: HealthRecord;   // present = edit mode
  onDone: (saved: boolean) => void;
}

export default function RecordForm({ petId, record, onDone }: Props) {
  // Weight is stored in kilograms; the field shows and accepts the user's own unit.
  const { t } = useTranslation();
  const { user } = useAuth();
  const unitSystem = user?.unit_system ?? "metric";
  const unit = weightUnit(unitSystem);

  const [title, setTitle] = useState(record?.title || "");
  const [recordType, setRecordType] = useState<RecordType>(record?.record_type || "Vaccination");
  const [date, setDate] = useState(record?.date || new Date().toLocaleDateString("en-CA"));
  const [description, setDescription] = useState(record?.description || "");
  const [nextDueDate, setNextDueDate] = useState(record?.next_due_date || "");
  const [weight, setWeight] = useState(
    record?.weight_kg != null ? String(fromKg(record.weight_kg, unitSystem)) : "",
  );
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const payload = {
      title,
      record_type: recordType,
      date,
      description: description || null,
      next_due_date: nextDueDate || null,
      weight_kg: recordType === "Weight" && weight ? toKg(parseFloat(weight), unitSystem) : null,
    };
    try {
      const saved = record
        ? await updateRecord(record.id, payload)
        : await createRecord(petId, payload);
      if (files.length > 0) {
        await uploadRecordPhotos(saved.id, files);
      }
      onDone(true);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p className="text-danger text-sm">{error}</p>}
      <div>
        <label className="block">{t("common.title")}</label>
        <Input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block">{t("recordForm.recordType")}</label>
        <select
          value={recordType}
          onChange={(e) => setRecordType(e.target.value as RecordType)}
          className="w-full rounded-lg bg-ink border border-border px-3 py-2.5 text-fg focus:border-primary focus:outline-none"
        >
          {RECORD_TYPES.map((type) => (
            <option key={type} value={type}>
              {t(`recordTypes.${type}`)}
            </option>
          ))}
        </select>
      </div>
      {recordType === "Weight" && (
        <div>
          <label className="block">{t("common.weight", { unit })}</label>
          <Input
            type="number"
            step="0.1"
            min="0"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            required
          />
        </div>
      )}
      <div>
        <label className="block">{t("common.date")}</label>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="block">{t("recordForm.description")}</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="w-full rounded-lg bg-ink border border-border px-3 py-2.5 text-fg placeholder:text-muted transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
        />
      </div>
      <div>
        <label className="block">{t("recordForm.nextDue")}</label>
        <Input
          type="date"
          value={nextDueDate}
          onChange={(e) => setNextDueDate(e.target.value)}
        />
      </div>
      <div>
        <label className="block text-sm text-muted mb-1">{t("recordForm.photos")}</label>
        <input
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => setFiles((prev) => [...prev, ...Array.from(e.target.files ?? [])])}
          className="text-sm text-muted file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-on-primary file:cursor-pointer hover:file:bg-primary-hover"
        />
        {files.length > 0 && (
          <ul className="mt-2 text-sm text-muted space-y-1">
            {files.map((f, i) => (
              <li key={i} className="flex items-center justify-between gap-2">
                {f.name}
                <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))} className="text-danger hover:brightness-125">{t("recordForm.removeFile")}</button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={submitting}>
          {submitting ? t("common.saving") : t("common.save")}
        </Button>
        <Button type="button" variant="secondary" onClick={() => onDone(false)}>
          {t("common.cancel")}
        </Button>
      </div>
    </form>
  );
}