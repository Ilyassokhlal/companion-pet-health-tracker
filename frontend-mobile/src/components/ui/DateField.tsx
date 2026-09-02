import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { formatDate } from "@/dates";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maximumDate?: Date;
  clearable?: boolean;
};

export default function DateField({ label, value, onChange, maximumDate, clearable }: Props) {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);

  return (
    <View>
      <Text className="mb-1 text-sm text-muted">{label}</Text>
      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={() => setShow(true)}
          className="flex-1 rounded-lg border border-border bg-ink px-4 py-3"
        >
          <Text className={value ? "text-fg" : "text-muted"}>
            {value ? formatDate(value) : t("common.notSet")}
          </Text>
        </Pressable>
        {clearable && value ? (
          <Pressable onPress={() => onChange("")}>
            <Text className="text-sm text-danger">{t("common.clear")}</Text>
          </Pressable>
        ) : null}
      </View>
      {show ? (
        <DateTimePicker
          value={value ? new Date(`${value}T00:00:00`) : new Date()}
          mode="date"
          maximumDate={maximumDate}
          onChange={(event, selected) => {
            setShow(false);
            if (event.type === "set" && selected) {
              onChange(selected.toLocaleDateString("en-CA"));
            }
          }}
        />
      ) : null}
    </View>
  );
}