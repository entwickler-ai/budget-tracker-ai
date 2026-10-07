// backend/src/types/finance.ts

//info: ? => Made optional to support insightController.ts and Firebase Database Daten (Convert)
// Usage in insightController.ts, firebaseService.ts, prompt
import type { Category } from '../constants/categories';

export interface Transaction {
    id?: string;
    userId: string;
    amount: number;
    category: Category;
    type: 'income' | 'expense';
    description?: string;
    date: string;
}

// Usage in insightController.ts, firebaseService.ts, prompt -> (backend) & Usage in database.ts -> BudgetTrackerAi
export interface Budget {
    id?: string;
    userId: string;
    category: Category;
    limit: number;
    period: 'weekly' | 'monthly' | 'yearly';
    startDate: string;
}