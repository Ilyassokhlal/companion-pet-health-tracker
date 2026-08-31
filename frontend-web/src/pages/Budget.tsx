import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { usePets } from "../context/PetContext";
import { useAuth } from "../auth/AuthContext";
import { listExpenses, createExpense, updateExpense, deleteExpense, getExpenseSummary } from "../api/expenses";
import type { ExpenseCreate } from "../api/expenses";
import { listRecords } from "../api/records";
import { EXPENSE_CATEGORIES } from "../types";
import type { Expense, ExpenseCategory, ExpenseSummary, HealthRecord } from "../types";
import { formatMoney } from "../units";
import { formatDate } from "../dates";
import Button from "../components/ui/Button";
import Modal from "../components/ui/Modal";

const FIELD = "w-full rounded-lg bg-ink border border-border px-3 py-2 text-sm text-fg focus:border-primary focus:outline-none";

// Mapping of expense status to corresponding CSS classes for the progress bar.
const BAR: Record<string, string> = {
  none: "bg-primary",
  ok: "bg-primary",
  warning: "bg-warning",
  over: "bg-danger",
};

// Budget page for tracking a pet's expenses within a given month.
export default function Budget() {
  const { t } = useTranslation();
  const { currentPet } = usePets();
  const { user } = useAuth();
  const currency = user?.currency ?? "USD";

  // The currently selected month in "YYYY-MM" format.
  const [month, setMonth] = useState(() => new Date().toLocaleDateString("en-CA").slice(0, 7));
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [confirming, setConfirming] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("food");
  const [recordId, setRecordId] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    if (!currentPet) return;
    setLoading(true);
    try {
      const [rows, totals] = await Promise.all([
        listExpenses(currentPet.id, month),
        getExpenseSummary(currentPet.id, month),
      ]);
      setExpenses(rows);
      setSummary(totals);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [currentPet, month]);

  useEffect(() => {
    load();
  }, [load]);

  // Load the pet's health records once, as they are needed for the record picker in the expense form.
  useEffect(() => {
    if (!currentPet) return;
    listRecords(currentPet.id).then(setRecords).catch(() => setRecords([]));
  }, [currentPet]);

  function openCreate() {
    setEditing(null);
    setDate(new Date().toLocaleDateString("en-CA"));
    setAmount("");
    setCategory("food");
    setRecordId("");
    setNotes("");
    setError(null);
    setFormOpen(true);
  }

  function openEdit(expense: Expense) {
    setEditing(expense);
    setDate(expense.date);
    setAmount(String(expense.amount));
    setCategory(expense.category);
    setRecordId(expense.record_id === null ? "" : String(expense.record_id));
    setNotes(expense.notes ?? "");
    setError(null);
    setFormOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!currentPet) return;
    // Prepare the payload for creating or updating an expense, converting empty strings to null where appropriate.
    const payload: ExpenseCreate = {
      date,
      amount: Number(amount),
      category,
      record_id: recordId === "" ? null : Number(recordId),
      notes: notes.trim() === "" ? null : notes.trim(),
    };
    try {
      if (editing) await updateExpense(editing.id, payload);
      else await createExpense(currentPet.id, payload);
      setFormOpen(false);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteExpense(id);
      setConfirming(null);
      load();
    } catch (err) {
      setError((err as Error).message);
    }
  }

  if (!currentPet) return <p className="text-muted p-4 sm:p-8">{t("budget.noPet")}</p>;

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-fg">{t("budget.title")}</h1>
        <div className="flex items-center gap-2">
          <input
            type="month"
            aria-label={t("budget.month")}
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className={`${FIELD} w-auto`}
          />
          <Button onClick={openCreate} className="flex items-center gap-1.5">
            <Plus size={16} />
            {t("budget.log")}
          </Button>
        </div>
      </div>

      {summary && (
        <div className="mb-6 rounded-xl border border-border bg-surface p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-lg font-semibold text-fg">{formatMoney(summary.total, summary.currency)}</p>
            <p className="text-sm text-muted">
              {summary.limit === null
                ? t("budget.noLimit")
                : t("budget.of", { limit: formatMoney(summary.limit, summary.currency) })}
            </p>
          </div>

          {summary.limit !== null && (
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-ink">
              <div
                className={`h-full transition-all ${BAR[summary.status]}`}
                style={{ width: `${Math.min(summary.percent ?? 0, 100)}%` }}
              />
            </div>
          )}

          {summary.currencies.length > 1 && (
            <p className="mt-2 text-sm text-warning">
              {t("budget.mixedCurrencies", { codes: summary.currencies.join(", ") })}
            </p>
          )}

          {summary.by_category.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
              {summary.by_category.map((row) => (
                <span key={row.category} className="text-sm text-muted">
                  {t(`budget.categories.${row.category}`)} · {formatMoney(row.total, summary.currency)}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <p className="mb-4 text-sm text-danger">{error}</p>}
      {loading && <p className="text-muted">{t("common.loading")}</p>}
      {!loading && expenses.length === 0 && <p className="text-muted">{t("budget.empty")}</p>}

      <div className="flex flex-col gap-3">
        {expenses.map((expense) => (
          <div key={expense.id} className="rounded-xl border border-border bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-fg">
                  {formatMoney(expense.amount, expense.currency)} · {t(`budget.categories.${expense.category}`)}
                </p>
                <p className="text-sm text-muted">{formatDate(expense.date)}</p>
              </div>
              {confirming === expense.id ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-fg">{t("budget.confirmDelete")}</span>
                  <button
                    onClick={() => handleDelete(expense.id)}
                    className="rounded-lg bg-danger px-3 py-1.5 text-sm font-medium text-white transition hover:brightness-110"
                  >
                    {t("common.delete")}
                  </button>
                  <button
                    onClick={() => setConfirming(null)}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition hover:text-fg"
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(expense)}
                    aria-label={t("budget.edit")}
                    className="rounded-lg p-2 text-muted transition hover:bg-hover hover:text-fg"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setConfirming(expense.id)}
                    aria-label={t("common.delete")}
                    className="rounded-lg p-2 text-danger transition hover:bg-danger/10"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
            {expense.notes && <p className="mt-2 text-sm text-muted">{expense.notes}</p>}
          </div>
        ))}
      </div>

      <Modal open={formOpen} title={editing ? t("budget.edit") : t("budget.log")} onClose={() => setFormOpen(false)}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="text-sm text-muted">
            {t("budget.date")}
            <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={`mt-1 ${FIELD}`} />
          </label>
          <label className="text-sm text-muted">
            {t("budget.amount", { currency })}
            <input
              type="number"
              required
              min={0.01}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`mt-1 ${FIELD}`}
            />
          </label>
          <label className="text-sm text-muted">
            {t("budget.category")}
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className={`mt-1 ${FIELD}`}
            >
              {EXPENSE_CATEGORIES.map((name) => (
                <option key={name} value={name}>
                  {t(`budget.categories.${name}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-muted">
            {t("budget.record")}
            <select value={recordId} onChange={(e) => setRecordId(e.target.value)} className={`mt-1 ${FIELD}`}>
              <option value="">{t("budget.noRecord")}</option>
              {records.map((record) => (
                <option key={record.id} value={record.id}>
                  {formatDate(record.date)} · {record.title}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm text-muted">
            {t("budget.notes")}
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={`mt-1 ${FIELD}`} />
          </label>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setFormOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit">{t("common.save")}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}