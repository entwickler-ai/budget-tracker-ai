// BudgetTrackerAi/src/utils/financeCalculations.ts
import { Transaction } from '@/types/finance';

export type TransactionSummary = {
    income: number;
    expenses: number;
    balance: number;
};

export const calculateTransactionSummary = (transactions: Transaction[]): TransactionSummary => {
    const income = transactions
        .filter((tx) => tx.type === 'income')
        .reduce((sum, tx) => sum + tx.amount, 0);
    const expenses = transactions
        .filter((tx) => tx.type === 'expense')
        .reduce((sum, tx) => sum + tx.amount, 0);
    const balance = income - expenses;
    return { income, expenses, balance };
};