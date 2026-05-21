export type TransactionType = 'income' | 'expense';

export type IncomeCategory =
  | 'order_cash'
  | 'order_bkash'
  | 'order_card'
  | 'steadfast_payout'
  | 'other_income';

export type ExpenseCategory =
  | 'rent'
  | 'salary'
  | 'marketing'
  | 'inventory'
  | 'delivery'
  | 'utility'
  | 'other';

export type TransactionCategory = IncomeCategory | ExpenseCategory;

export type TransactionPaymentMethod = 'cash' | 'bkash' | 'card' | 'bank';

export interface TransactionReference {
  type: 'order' | 'manual' | 'steadfast';
  id?: string;
}

export interface TransactionAttachment {
  url: string;
  publicId: string;
}

export interface Transaction {
  _id: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  date: string;
  reference: TransactionReference;
  description: string;
  paymentMethod: TransactionPaymentMethod;
  attachments: TransactionAttachment[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseInput {
  category: ExpenseCategory;
  amount: number;
  date: string;
  description: string;
  paymentMethod: TransactionPaymentMethod;
  attachments?: TransactionAttachment[];
}

export interface AccountsSummary {
  totalIncome: number;
  totalExpense: number;
  netProfit: number;
  cashInHand: number;
  incomeByMethod: Record<string, number>;
  expenseByCategory: Record<string, number>;
}
