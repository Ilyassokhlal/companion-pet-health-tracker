import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { reportMessage, REPORT_REASONS } from "@/api/chat";
import type { ReportReason } from "@/api/chat";
import { errorMessage } from "@/errors";
import Button from "@/components/ui/Button";
import FormModal from "@/components/ui/FormModal";
import { useTheme } from "@/theme/ThemeContext";
import { themeColors } from "@/theme/palette";

type Props = {
  messageId: number;
  reported: boolean;
  onReported: () => void;
};

// The flag under an AI answer and the form it opens. Google Play requires a way to report an answer inside the app.
// Reporting stays open for a locked account, like reading the answers.
export default function ReportAnswer({ messageId, reported, onReported }: Props) {
  const { t } = useTranslation();
  const { theme, accent } = useTheme();
  const colors = themeColors(theme, accent);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  if (reported) {
    return (
      <View className="mt-2 flex-row items-center gap-1">
        <Ionicons name="flag" size={12} color={colors.muted} />
        <Text className="text-xs text-muted">{t("report.reported")}</Text>
      </View>
    );
  }

  function start() {
    setReason(null);
    setNote("");
    setError("");
    setOpen(true);
  }

  async function send() {
    if (!reason) return;
    setSending(true);
    setError("");
    try {
      await reportMessage(messageId, reason, note);
      setOpen(false);
      onReported();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Pressable
        onPress={start}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={t("report.flag")}
        className="mt-2 self-start active:opacity-60"
      >
        <Ionicons name="flag-outline" size={14} color={colors.muted} />
      </Pressable>

      <FormModal visible={open} onClose={() => setOpen(false)} openWhenLocked>
        <Text className="mb-2 text-lg font-semibold text-fg">{t("report.title")}</Text>
        <Text className="mb-4 text-sm text-muted">{t("report.intro")}</Text>

        {REPORT_REASONS.map((code) => (
          <Pressable
            key={code}
            onPress={() => setReason(code)}
            accessibilityRole="radio"
            accessibilityState={{ checked: reason === code }}
            className={`mb-2 flex-row items-center gap-3 rounded-lg border px-3 py-3 ${
              reason === code ? "border-primary" : "border-border"
            }`}
          >
            <Ionicons
              name={reason === code ? "radio-button-on" : "radio-button-off"}
              size={18}
              color={reason === code ? colors.primary : colors.muted}
            />
            <Text className="flex-1 text-fg">{t(`report.reasons.${code}`)}</Text>
          </Pressable>
        ))}

        <Text className="mb-1 mt-3 text-sm text-muted">{t("report.note")}</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          multiline
          maxLength={1000}
          className="mb-3 min-h-20 rounded-lg border border-border bg-surface px-4 py-3 text-fg"
        />
        <Text className="mb-4 text-xs text-muted">{t("report.notice")}</Text>
        {error ? <Text className="mb-3 text-sm text-danger">{error}</Text> : null}

        <Button label={t("report.send")} onPress={send} disabled={!reason} loading={sending} />

        <View className="mt-3 flex-row">
          <Pressable onPress={() => setOpen(false)} className="px-2 py-2">
            <Text className="text-muted">{t("common.cancel")}</Text>
          </Pressable>
        </View>
      </FormModal>
    </>
  );
}
