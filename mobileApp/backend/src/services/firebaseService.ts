// backend/src/services/firebaseService.ts
import admin from 'firebase-admin';
import { Budget, Transaction } from '../types/finance';
import { BudgetSchema, TransactionSchema } from '../schemas/financeSchema';
import { logger } from '../utils/logger';

admin.initializeApp({
    credential: admin.credential.applicationDefault(),
});

const db = admin.firestore();

const formatFirebaseDate = (input: admin.firestore.Timestamp | string, locale = 'en-GB'): string => {
    try {
        if (typeof input === 'string') {
            const date = new Date(input);
            if (isNaN(date.getTime())) {
                throw new Error('Invalid date string');
            }
            return date.toISOString();
        }
        const date = input.toDate();
        return date.toISOString();
    } catch (error) {
        logger.error('Failed to format date', { error: error instanceof Error ? error.message : 'Unknown error', input });
        return 'Invalid Date';
    }
};

export const getUserTransactions = async (
    userId: string,
    limit = 100,
    startAfter?: admin.firestore.Timestamp,
    startDate?: Date,
    endDate?: Date
): Promise<Transaction[]> => {
    try {
        let query: admin.firestore.Query = db
            .collection('transactions')
            .where('userId', '==', userId)
            .orderBy('date', 'desc')
            .limit(limit);

        if (startDate) {
            query = query.where('date', '>=', admin.firestore.Timestamp.fromDate(startDate));
        }

        if (endDate) {
            query = query.where('date', '<=', admin.firestore.Timestamp.fromDate(endDate));
        }

        if (startAfter) {
            query = query.startAfter(startAfter);
        }

        const snapshot = await query.get();

        return snapshot.docs.map((doc) => {
            const raw = doc.data();
            return TransactionSchema.parse({
                id: doc.id,
                ...raw,
                date: raw.date ? formatFirebaseDate(raw.date) : 'Invalid Date',
            });
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        logger.error('Failed to fetch transactions', {
            userId,
            error: errorMessage,
            stack: error instanceof Error ? error.stack : undefined
        });
        throw new Error(`Failed to fetch transactions: ${errorMessage}`);
    }
};

export const getUserBudgets = async (
    userId: string,
    limit = 100,
    startDate?: Date,
    endDate?: Date
): Promise<Budget[]> => {
    try {
        let query: admin.firestore.Query = db
            .collection('budgets')
            .where('userId', '==', userId)
            .orderBy('startDate', 'desc')
            .limit(limit);

        if (startDate) {
            query = query.where('startDate', '>=', admin.firestore.Timestamp.fromDate(startDate));
        }

        if (endDate) {
            query = query.where('startDate', '<=', admin.firestore.Timestamp.fromDate(endDate));
        }

        const snapshot = await query.get();

        const budgets: Budget[] = [];
        for (const doc of snapshot.docs) {
            try {
                const raw = doc.data();
                const formattedStartDate = raw.startDate ? formatFirebaseDate(raw.startDate) : 'Invalid Date';
                const formattedCreatedAt = raw.createdAt ? formatFirebaseDate(raw.createdAt) : undefined;
                const formattedUpdatedAt = raw.updatedAt ? formatFirebaseDate(raw.updatedAt) : undefined;

                if (formattedStartDate === 'Invalid Date') {
                    logger.warn(`Skipping budget with invalid startDate: ${doc.id}`, { raw });
                    continue;
                }

                const budget = BudgetSchema.parse({
                    id: doc.id,
                    ...raw,
                    startDate: formattedStartDate,
                    createdAt: formattedCreatedAt,
                    updatedAt: formattedUpdatedAt,
                });
                budgets.push(budget);
            } catch (error) {
                logger.error(`Failed to parse budget ${doc.id}`, {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    raw: doc.data(),
                });
            }
        }

        if (budgets.length === 0) {
            logger.warn(`No valid budgets found for userId: ${userId}`);
        }

        return budgets;
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        logger.error('Failed to fetch budgets', {
            userId,
            error: errorMessage,
            stack: error instanceof Error ? error.stack : undefined,
        });
        throw new Error(`Failed to fetch budgets: ${errorMessage}`);
    }
};

export const addTransaction = async (transaction: Transaction): Promise<string> => {
    try {
        const validated = TransactionSchema.parse(transaction);
        const docRef = await db.collection('transactions').add(validated);
        return docRef.id;
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        logger.error('Failed to add transaction', { error: errorMessage });
        throw new Error('Failed to add transaction');
    }
};

export const updateTransaction = async (id: string, transaction: Transaction): Promise<void> => {
    try {
        const validated = TransactionSchema.parse({ ...transaction, id });
        await db.collection('transactions').doc(id).set(validated, { merge: true });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        logger.error('Failed to update transaction', { id, error: errorMessage });
        throw new Error('Failed to update transaction');
    }
};

export const deleteTransaction = async (id: string): Promise<void> => {
    try {
        await db.collection('transactions').doc(id).delete();
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        logger.error('Failed to delete transaction', { id, error: errorMessage });
        throw new Error('Failed to delete transaction');
    }
};

export const getTransaction = async (id: string): Promise<Transaction | null> => {
    try {
        const docSnap = await db.collection('transactions').doc(id).get();
        if (!docSnap.exists) return null;
        const raw = docSnap.data();
        return TransactionSchema.parse({
            id: docSnap.id,
            ...raw,
            date: raw?.date ? formatFirebaseDate(raw.date) : 'Invalid Date',
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        logger.error('Failed to fetch transaction', { id, error: errorMessage });
        throw new Error('Failed to fetch transaction');
    }
};

export const addBudget = async (budget: Budget): Promise<string> => {
    try {
        const validated = BudgetSchema.parse(budget);
        const budgetWithTimestamp = {
            ...validated,
            startDate: admin.firestore.Timestamp.fromDate(new Date(validated.startDate)),
        };
        const docRef = await db.collection('budgets').add(budgetWithTimestamp);
        return docRef.id;
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        logger.error('Failed to add budget', { error: errorMessage });
        throw new Error('Failed to add budget');
    }
};

export const updateBudget = async (id: string, budget: Budget): Promise<void> => {
    try {
        const validated = BudgetSchema.parse({ ...budget, id });
        await db.collection('budgets').doc(id).set(validated, { merge: true });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        logger.error('Failed to update budget', { id, error: errorMessage });
        throw new Error('Failed to update budget');
    }
};

export const deleteBudget = async (id: string): Promise<void> => {
    try {
        await db.collection('budgets').doc(id).delete();
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        logger.error('Failed to delete budget', { id, error: errorMessage });
        throw new Error('Failed to delete budget');
    }
};

export const getBudget = async (id: string): Promise<Budget | null> => {
    try {
        const docSnap = await db.collection('budgets').doc(id).get();
        if (!docSnap.exists) return null;
        const raw = docSnap.data();
        return BudgetSchema.parse({
            id: docSnap.id,
            ...raw,
            startDate: raw?.startDate ? formatFirebaseDate(raw.startDate) : 'Invalid Date',
        });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        logger.error('Failed to fetch budget', { id, error: errorMessage });
        throw new Error('Failed to fetch budget');
    }
};