import { TextInput, type TextInputProps } from "react-native";

export default function Input(props: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor="#9c93b8"
      className="w-full rounded-lg border border-border bg-ink px-4 py-3 text-fg"
      {...props}
    />
  );
}