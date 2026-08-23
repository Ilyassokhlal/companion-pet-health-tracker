import { ActivityIndicator, Pressable, Text } from "react-native";

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger";
};

export default function Button({ label, onPress, disabled, loading, variant = "primary" }: Props) {
  const tone =
    variant === "primary"
      ? "bg-primary"
      : variant === "danger"
        ? "bg-danger"
        : "bg-surface border border-border";
  const dimmed = disabled || loading ? "opacity-50" : "";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      className={`w-full flex-row items-center justify-center rounded-lg px-4 py-3 ${tone} ${dimmed}`}
    >
      {loading ? <ActivityIndicator color="#ece9f5" /> : <Text className="font-semibold text-fg">{label}</Text>}
    </Pressable>
  );
}