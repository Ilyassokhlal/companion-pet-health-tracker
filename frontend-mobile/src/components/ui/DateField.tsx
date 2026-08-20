import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maximumDate?: Date;
  clearable?: boolean;
};

export default function DateField({ label, value, onChange, maximumDate, clearable }: Props) {
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
            {value ? new Date(`${value}T00:00:00`).toLocaleDateString() : "Not set"}
          </Text>
        </Pressable>
        {clearable && value ? (
          <Pressable onPress={() => onChange("")}>
            <Text className="text-sm text-danger">Clear</Text>
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