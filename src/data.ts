import type { ExpenseCategory, SavingsPlan, Transaction } from './types';

export const defaultCategories = ['Food', 'Transport', 'Housing', 'Health', 'Entertainment', 'Education', 'Debt', 'Other'];
export const paymentMethods = ['Cash', 'Debit card', 'Credit card', 'Bank transfer', 'Digital wallet'];

export const demoTransactions: Transaction[] = [
  { id: crypto.randomUUID(), type: 'income', amount: 4200, date: new Date().toISOString().slice(0, 10), description: 'Salary', category: 'Salary', paymentMethod: 'Bank transfer' },
  { id: crypto.randomUUID(), type: 'expense', amount: 980, date: new Date().toISOString().slice(0, 10), description: 'Rent', category: 'Housing', paymentMethod: 'Bank transfer' },
  { id: crypto.randomUUID(), type: 'expense', amount: 320, date: new Date().toISOString().slice(0, 10), description: 'Groceries', category: 'Food', paymentMethod: 'Debit card' },
  { id: crypto.randomUUID(), type: 'expense', amount: 95, date: new Date().toISOString().slice(0, 10), description: 'Metro and rideshare', category: 'Transport', paymentMethod: 'Digital wallet' },
];

export const demoCategories: ExpenseCategory[] = defaultCategories.map((name) => ({ id: crypto.randomUUID(), name, isDefault: true }));
export const defaultSavingsPlan: SavingsPlan = { monthlyGoal: 800 };
