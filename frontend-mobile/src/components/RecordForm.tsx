import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, TextInput, View } from "react-native";

import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import DateField from "@/components/ui/DateField";
import * as ImagePicker from "expo-image-picker";
import { createRecord, updateRecord, uploadRecordPhotos } from "@/api/records";
import type { PhotoUpload } from "@/api/records";
import { RECORD_TYPES } from "@/types";
import type { HealthRecord, RecordType } from "@/types";
import { useTheme } from "@/theme/ThemeContext";
import { themeColors } from "@/theme/palette";
import { useAuth } from "@/auth/AuthContext";
import { fromKg, toKg, weightUnit } from "@/units";
import { errorMessage } from "@/errors";

interface Props {
  petId: number;
  record?: HealthRecord;
  onDone: (saved: boolean) => void;
}

export default function RecordForm({ petId, record, onDone }: Props) {
  const { t } = useTranslation();
  const { theme, accent } = useTheme();
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
  const [files, setFiles] = useState<PhotoUpload[]>([]);

  function addAsset(asset: ImagePicker.ImagePickerAsset) {
    setFiles((prev) => [
      ...prev,
      {
        uri: asset.uri,
        name: asset.fileName ?? `photo-${Date.now()}.jpg`,
        type: asset.mimeType ?? "image/jpeg",
      },
    ]);
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setError(t("recordForm.cameraDenied"));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (!result.canceled) result.assets.forEach(addAsset);
  }

  async function pickPhotos() {
    const result = await ImagePicker.launchImageLibraryAsync({
      allowsMultipleSelection: true,
      mediaTypes: ["images"],
      quality: 0.7,
    });
    if (!result.canceled) result.assets.forEach(addAsset);
  }

  async function handleSubmit() {
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
  }

  return (
    <View className="gap-4">
      {error ? <Text className="text-sm text-danger">{error}</Text> : null}

      <View>
        <Text className="mb-1 text-sm text-muted">{t("common.title")}</Text>
        <Input value={title} onChangeText={setTitle} placeholder={t("common.title")} />
      </View>

      <View>
        <Text className="mb-1 text-sm text-muted">{t("recordForm.recordType")}</Text>
        <View className="flex-row flex-wrap gap-2">
          {RECORD_TYPES.map((type) => (
            <Pressable
              key={type}
              onPress={() => setRecordType(type)}
              className={`rounded-lg px-3 py-2 ${
                recordType === type ? "bg-primary" : "border border-border bg-ink"
              }`}
            >
              <Text className="text-sm text-fg">{t(`recordTypes.${type}`)}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {recordType === "Weight" ? (
        <View>
          <Text className="mb-1 text-sm text-muted">{t("common.weight", { unit })}</Text>
          <Input
            value={weight}
            onChangeText={setWeight}
            placeholder={unit}
            keyboardType="decimal-pad"
          />
        </View>
      ) : null}

      <DateField label={t("common.date")} value={date} onChange={setDate} />

      <View>
        <Text className="mb-1 text-sm text-muted">{t("recordForm.description")}</Text>
        <TextInput
          value={description}
          onChangeText={setDescription}
          multiline
          textAlignVertical="top"
          placeholder={t("common.optional")}
          placeholderTextColor={themeColors(theme, accent).muted}
          className="min-h-24 w-full rounded-lg border border-border bg-ink px-4 py-3 text-fg"
        />
      </View>

      <DateField label={t("recordForm.nextDue")} value={nextDueDate} onChange={setNextDueDate} clearable />

      <View>
        <Text className="mb-1 text-sm text-muted">{t("recordForm.photos")}</Text>
        <View className="flex-row gap-2">
          <Pressable
            onPress={takePhoto}
            className="flex-1 rounded-lg border border-border bg-ink px-4 py-3"
          >
            <Text className="text-center text-fg">{t("recordForm.takePhoto")}</Text>
          </Pressable>
          <Pressable
            onPress={pickPhotos}
            className="flex-1 rounded-lg border border-border bg-ink px-4 py-3"
          >
            <Text className="text-center text-fg">{t("recordForm.choose")}</Text>
          </Pressable>
        </View>
        {files.map((f, i) => (
          <View key={f.uri} className="mt-2 flex-row items-center justify-between">
            <Text numberOfLines={1} className="flex-1 text-sm text-muted">
              {f.name}
            </Text>
            <Pressable onPress={() => setFiles(files.filter((_, j) => j !== i))}>
              <Text className="ms-3 text-sm text-danger">{t("recordForm.removeFile")}</Text>
            </Pressable>
          </View>
        ))}
      </View>

      <Button label={record ? t("common.save") : t("recordForm.add")} onPress={handleSubmit} loading={submitting} />
      <Button label={t("common.cancel")} variant="secondary" onPress={() => onDone(false)} />
    </View>
  );
}