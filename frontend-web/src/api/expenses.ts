import { apiFetch } from "./client";
import type { Expense, ExpenseCategory, ExpenseSummary } from "../types";

// The shape of the data required to create a new expense.
export type ExpenseCreate = {
  date: string;
  amount: number;
  category: ExpenseCategory;
  record_id?: number | null;
  notes?: string | null;
};

export type ExpenseUpdate = Partial<ExpenseCreate>;

// Fetch the list of expenses for a given pet, optionally filtered by month. Returns an array of expenses.
export async function listExpenses(petId: number, month?: string): Promise<Expense[]> {
  const query = month ? `?month=${month}` : "";
  return apiFetch<Expense[]>(`/pets/${petId}/expenses${query}`);
}

// Create a new expense for a given pet. Returns the created expense.
export async function createExpense(petId: number, expense: ExpenseCreate): Promise<Expense> {
  return apiFetch<Expense>(`/pets/${petId}/expenses`, {
    method: "POST",
    body: JSON.stringify(expense),
  });
}

// Update an existing expense by its ID. Returns the updated expense.
export async function updateExpense(expenseId: number, expense: ExpenseUpdate): Promise<Expense> {
  return apiFetch<Expense>(`/expenses/${expenseId}`, {
    method: "PATCH",
    body: JSON.stringify(expense),
  });
}

// Delete an expense by its ID. Returns nothing.
export async function deleteExpense(expenseId: number): Promise<void> {
  return apiFetch<void>(`/expenses/${expenseId}`, { method: "DELETE" });
}

// Fetch a pet's spending summary for a given month. Returns an expense summary object.
export async function getExpenseSummary(petId: number, month?: string): Promise<ExpenseSummary> {
  const query = month ? `?month=${month}` : "";
  return apiFetch<ExpenseSummary>(`/pets/${petId}/expense-summary${query}`);
}