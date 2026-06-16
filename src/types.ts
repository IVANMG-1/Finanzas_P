export type TransactionType = 'income' | 'expense';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string;
  description: string;
  category: string;
  paymentMethod: string;
  userId?: string;
}

export interface ExpenseCategory {
  id: string;
  name: string;
  userId?: string;
  isDefault?: boolean;
}

export interface SavingsPlan {
  monthlyGoal: number;
}

export interface ProjectionPoint {
  month: string;
  income: number;
  expenses: number;
  cashFlow: number;
  projectedBalance: number;
}
