import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import FormModal from "@/components/ui/FormModal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/auth/AuthContext";
import { usePets } from "@/context/PetContext";
import {
  listExpenses, createExpense, updateExpense, deleteExpense, getExpenseSummary,
} from "@/api/expenses";
import { listRecords } from "@/api/records";
import { updatePet } from "@/api/pets";
import { EXPENSE_CATEGORIES } from "@/types";
import type { Expense, ExpenseCategory, ExpenseSummary, HealthRecord } from "@/types";
import { formatDate, dateLocale } from "@/dates";
import { formatMoney } from "@/units";
import DateField from "@/components/ui/DateField";
import Button from "@/components/ui/Button";
import { useTheme } from "@/theme/ThemeContext";
import { themeColors } from "@/theme/palette";

// The bar fills toward the pet's monthly limit. The server decides the status, this only picks a colour.
// The different bar statuses and their corresponding CSS classes.
const BAR: Record<string, string> = {
  none: "bg-primary",
  ok: "bg-primary",
  warning: "bg-warning",
  over: "bg-danger",
};

// Shift a YYYY-MM month by a given number of months, returning a new YYYY-MM string.
function shiftMonth(month: string, delta: number): string {
  const [year, index] = month.split("-").map(Number);
  const shifted = new Date(year, index - 1 + delta, 1);
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, "0")}`;
}

// Convert a YYYY-MM month string into a human-readable label like "August 2026".
function monthLabel(month: string): string {
  const [year, index] = month.split("-").map(Number);
  return new Date(year, index - 1, 1).toLocaleDateString(dateLocale(), { month: "long", year: "numeric" });
}

// Budget tracking screen.
export default function Budget() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { currentPet, refresh } = usePets();
  const currency = user?.currency ?? "USD";

  // The currently selected month in YYYY-MM format.
  const [month, setMonth] = useState(() => new Date().toLocaleDateString("en-CA").slice(0, 7));
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [editing, setEditing] = useState<Expense | "new" | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The limit lives on the pet, so it is edited here as well as in the pet form.
  const [limitOpen, setLimitOpen] = useState(false);
  const [limitValue, setLimitValue] = useState("");

  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("food");
  const [recordId, setRecordId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  const { theme, accent } = useTheme();
  const colors = themeColors(theme, accent);

  const load = useCallback(() => {
    if (!currentPet) {
      setExpenses([]);
      setSummary(null);
      return;
    }
    listExpenses(currentPet.id, month).then(setExpenses).catch(console.error);
    getExpenseSummary(currentPet.id, month).then(setSummary).catch(console.error);
  }, [currentPet, month]);

  // Reload the expenses and summary whenever the screen gains focus.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // Load the pet's health records once, as they are needed for the record picker.
  useEffect(() => {
    if (!currentPet) return;
    listRecords(currentPet.id).then(setRecords).catch(() => setRecords([]));
  }, [currentPet]);

  // Save the new monthly budget limit for the current pet.
  async function saveLimit(value: number | null) {
    if (!currentPet) return;
    try {
      await updatePet(currentPet.id, { monthly_budget: value });
      setLimitOpen(false);
      await refresh();
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  function open(expense: Expense | "new") {
    setError(null);
    if (expense === "new") {
      setDate(new Date().toLocaleDateString("en-CA"));
      setAmount("");
      setCategory("food");
      setRecordId(null);
      setNotes("");
    } else {
      setDate(expense.date);
      setAmount(String(expense.amount));
      setCategory(expense.category);
      setRecordId(expense.record_id);
      setNotes(expense.notes ?? "");
    }
    setEditing(expense);
  }

  async function save() {
    if (!currentPet || editing === null) return;
    const typed = Number(amount);
    if (!Number.isFinite(typed) || typed <= 0) {
      setError(t("budget.invalidAmount"));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        date,
        amount: typed,
        category,
        record_id: recordId,
        notes: notes.trim() === "" ? null : notes.trim(),
      };
      if (editing === "new") await createExpense(currentPet.id, payload);
      else await updateExpense(editing.id, payload);
      setEditing(null);
      load();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(expense: Expense) {
    Alert.alert(t("budget.confirmDeleteTitle"), t("budget.confirmDeleteBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          await deleteExpense(expense.id);
          setEditing(null);
          load();
        },
      },
    ]);
  }

  if (!currentPet) {
    return (
      <View className="flex-1 items-center justify-center px-6">
        <Text className="text-center text-muted">{t("budget.noPet")}</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <ScrollView contentContainerStyle={{ padding: 16, paddingTop: insets.top + 16 }}>
        <Text className="mb-1 text-2xl font-bold text-fg">{t("budget.title")}</Text>
        <Text className="mb-6 text-sm text-muted">{currentPet.name}</Text>

        <View className="mb-4 flex-row items-center justify-between">
          <Pressable onPress={() => setMonth(shiftMonth(month, -1))} className="px-3 py-2 active:opacity-70">
            <Text className="text-lg text-fg">‹</Text>
          </Pressable>
          <Text className="text-base font-semibold text-fg">{monthLabel(month)}</Text>
          <Pressable onPress={() => setMonth(shiftMonth(month, 1))} className="px-3 py-2 active:opacity-70">
            <Text className="text-lg text-fg">›</Text>
          </Pressable>
        </View>

        {summary ? (
          <View className="mb-6 rounded-xl border border-border bg-surface p-4">
            <View className="flex-row flex-wrap items-baseline justify-between gap-2">
              <Text className="text-lg font-semibold text-fg">
                {formatMoney(summary.total, summary.currency)}
              </Text>
              <Pressable
                onPress={() => {
                  setLimitValue(summary.limit === null ? "" : String(summary.limit));
                  setLimitOpen((isOpen) => !isOpen);
                }}
                className={`flex-row items-center gap-1.5 rounded-lg border px-3 py-1.5 active:opacity-70 ${
                  summary.status === "over" ? "border-danger" : "border-border"
                }`}
              >
                {/* "over" means total >= limit. Nothing on the server blocks the expense, so this
                    only reports what the red bar already shows. */}
                <Ionicons
                  name="pencil"
                  size={13}
                  color={summary.status === "over" ? colors.danger : colors.muted}
                />
                <Text
                  className={`text-sm ${summary.status === "over" ? "font-semibold text-danger" : "text-muted"}`}
                >
                  {summary.limit === null
                    ? t("budget.noLimit")
                    : summary.status === "over"
                      ? t("budget.exceeded")
                      : t("budget.of", { limit: formatMoney(summary.limit, summary.currency) })}
                </Text>
              </Pressable>
            </View>

            {limitOpen ? (
              <View className="mt-3">
                <Text className="mb-2 text-sm text-muted">{t("budget.editLimit", { currency })}</Text>
                <TextInput
                  value={limitValue}
                  onChangeText={setLimitValue}
                  keyboardType="decimal-pad"
                  className="mb-3 rounded-lg border border-border bg-ink px-4 py-3 text-fg"
                />
                <View className="flex-row gap-2">
                  <View className="flex-1">
                    <Button
                      label={t("common.save")}
                      onPress={() => saveLimit(limitValue.trim() === "" ? null : Number(limitValue))}
                    />
                  </View>
                  <View className="flex-1">
                    <Button label={t("budget.clearLimit")} variant="secondary" onPress={() => saveLimit(null)} />
                  </View>
                </View>
              </View>
            ) : null}

            {summary.limit !== null ? (
              <View className="mt-3 h-2 w-full overflow-hidden rounded-full bg-ink">
                <View
                  className={`h-full ${BAR[summary.status]}`}
                  style={{ width: `${Math.min(summary.percent ?? 0, 100)}%` }}
                />
              </View>
            ) : null}

            {summary.currencies.length > 1 ? (
              <Text className="mt-2 text-sm text-warning">
                {t("budget.mixedCurrencies", { codes: summary.currencies.join(", ") })}
              </Text>
            ) : null}

            {summary.by_category.length > 0 ? (
              <View className="mt-3 flex-row flex-wrap gap-x-4 gap-y-1">
                {summary.by_category.map((row) => (
                  <Text key={row.category} className="text-sm text-muted">
                    {t(`budget.categories.${row.category}`)} · {formatMoney(row.total, summary.currency)}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        ) : null}

        <Pressable
          onPress={() => open("new")}
          className="mb-6 items-center rounded-lg bg-primary px-4 py-3 active:opacity-70"
        >
          <Text className="font-semibold text-on-primary">{t("budget.log")}</Text>
        </Pressable>

        {expenses.length === 0 ? (
          <Text className="text-muted">{t("budget.empty")}</Text>
        ) : (
          expenses.map((expense) => (
            <Pressable
              key={expense.id}
              onPress={() => open(expense)}
              className="mb-3 rounded-xl border border-border bg-surface p-4 active:opacity-70"
            >
              <View className="flex-row items-center justify-between gap-3">
                <Text className="font-semibold text-fg">
                  {formatMoney(expense.amount, expense.currency)}
                </Text>
                <Text className="text-sm text-muted">{t(`budget.categories.${expense.category}`)}</Text>
              </View>
              <Text className="mt-1 text-sm text-muted">{formatDate(expense.date)}</Text>
              {expense.notes ? <Text className="mt-2 text-sm text-fg">{expense.notes}</Text> : null}
            </Pressable>
          ))
        )}
      </ScrollView>

      <FormModal visible={editing !== null} onClose={() => setEditing(null)}>
              <Text className="mb-4 text-lg font-semibold text-fg">
                {editing === "new" ? t("budget.log") : t("budget.edit")}
              </Text>
              {error ? <Text className="mb-3 text-sm text-danger">{error}</Text> : null}

              <View className="mb-4">
                <DateField label={t("budget.date")} value={date} onChange={setDate} maximumDate={new Date()} />
              </View>

              <Text className="mb-1 text-sm text-muted">{t("budget.amount", { currency })}</Text>
              <TextInput
                value={amount}
                onChangeText={setAmount}
                keyboardType="decimal-pad"
                placeholder="45.00"
                className="mb-4 rounded-lg border border-border bg-surface px-4 py-3 text-fg"
              />

              <Text className="mb-1 text-sm text-muted">{t("budget.category")}</Text>
              <View className="mb-4 flex-row flex-wrap gap-2">
                {EXPENSE_CATEGORIES.map((name) => (
                  <Pressable
                    key={name}
                    onPress={() => setCategory(name)}
                    className={`rounded-lg px-3 py-2 ${
                      category === name ? "bg-primary" : "border border-border bg-ink"
                    }`}
                  >
                    <Text className={`text-sm ${category === name ? "text-on-primary" : "text-fg"}`}>
                      {t(`budget.categories.${name}`)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text className="mb-1 text-sm text-muted">{t("budget.record")}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
                <View className="flex-row gap-2">
                  <Pressable
                    onPress={() => setRecordId(null)}
                    className={`rounded-lg px-3 py-2 ${
                      recordId === null ? "bg-primary" : "border border-border bg-ink"
                    }`}
                  >
                    <Text className={`text-sm ${recordId === null ? "text-on-primary" : "text-fg"}`}>
                      {t("budget.noRecord")}
                    </Text>
                  </Pressable>
                  {records.map((record) => (
                    <Pressable
                      key={record.id}
                      onPress={() => setRecordId(record.id)}
                      className={`rounded-lg px-3 py-2 ${
                        recordId === record.id ? "bg-primary" : "border border-border bg-ink"
                      }`}
                    >
                      <Text className={`text-sm ${recordId === record.id ? "text-on-primary" : "text-fg"}`}>
                        {formatDate(record.date)} · {record.title}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>

              <Text className="mb-1 text-sm text-muted">{t("budget.notes")}</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                multiline
                className="mb-5 min-h-20 rounded-lg border border-border bg-surface px-4 py-3 text-fg"
              />

              <Button label={saving ? t("common.loading") : t("common.save")} onPress={save} disabled={saving} />

              <View className="mt-3 flex-row items-center justify-between">
                <Pressable onPress={() => setEditing(null)} className="px-2 py-2">
                  <Text className="text-muted">{t("common.cancel")}</Text>
                </Pressable>
                {editing !== "new" && editing !== null ? (
                  <Pressable onPress={() => confirmDelete(editing)} className="px-2 py-2">
                    <Text className="text-danger">{t("common.delete")}</Text>
                  </Pressable>
                ) : null}
              </View>
      </FormModal>
    </View>
  );
}