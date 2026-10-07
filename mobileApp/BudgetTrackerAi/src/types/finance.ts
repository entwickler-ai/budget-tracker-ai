// BudgetTrackerAi/src/types/finance.ts
import { CATEGORIES } from '@/constants/categories';
import { Timestamp } from 'firebase/firestore';

export type BudgetCategory = typeof CATEGORIES[number];
export type TransactionCategory = BudgetCategory;

export type Transaction = {
    id: string;
    userId: string;
    amount: number;
    category: TransactionCategory;
    type: 'income' | 'expense';
    description?: string;
    date: string;
};

export type Budget = {
    id: string;
    userId: string;
    category: BudgetCategory;
    limit: number;
    period: 'weekly' | 'monthly' | 'yearly';
    startDate: string | Timestamp;
};

export type InsightRequest = {
    query: string;
    userId: string;
    transactions?: {
        amount: number;
        category: TransactionCategory;
        type: 'income' | 'expense';
        date: string;
        description?: string;
        userId: string;
    }[];
};

export type InsightResponse = {
    result: string;
    error?: string;
};

export const timestampToString = (date: string | Timestamp): string => {
    if (date instanceof Timestamp) {
        return date.toDate().toISOString();
    }
    return date;
};