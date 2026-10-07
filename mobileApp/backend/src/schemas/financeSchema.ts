// backend/src/schemas/financeSchema.ts
import { z } from 'zod';
import { CATEGORIES } from '../constants/categories';

export const TransactionSchema = z.object({
    id: z.string().optional(),
    userId: z.string(),
    amount: z.number().positive(),
    category: z.enum([...CATEGORIES]),
    type: z.enum(['income', 'expense']),
    description: z.string().max(200).optional(),
    date: z.string().refine((val) => !isNaN(new Date(val).getTime()), {
        message: 'Invalid date format',
    }),
});

export const BudgetSchema = z.object({
    id: z.string().optional(),
    userId: z.string(),
    category: z.enum([...CATEGORIES]),
    limit: z.number().positive(),
    period: z.enum(['weekly', 'monthly', 'yearly']),
    startDate: z.string().refine((val) => !isNaN(new Date(val).getTime()), {
        message: 'Invalid date format',
    }),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
});