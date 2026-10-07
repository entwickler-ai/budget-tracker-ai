// BudgetTrackerAi/src/services/database.ts
import { auth, firestore } from './firebase';
import {
    collection,
    query,
    where,
    orderBy,
    onSnapshot,
    Unsubscribe,
} from 'firebase/firestore';
import {Transaction, Budget, timestampToString} from '@/types/finance';
import { getApiUrl } from './api';

export const addTransaction = async (transaction: Omit<Transaction, 'id'>): Promise<string> => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('User not authenticated');
    const response = await fetch(`${getApiUrl()}/api/transactions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(transaction),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add transaction');
    }
    const { id } = await response.json();
    return id;
};

export const updateTransaction = async (id: string, transaction: Transaction): Promise<void> => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('User not authenticated');
    const response = await fetch(`${getApiUrl()}/api/transactions/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(transaction),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update transaction');
    }
};

export const deleteTransaction = async (id: string): Promise<void> => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('User not authenticated');
    const response = await fetch(`${getApiUrl()}/api/transactions/${id}`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    const responseText = await response.text();
    if (!response.ok) {
        let error;
        try {
            error = JSON.parse(responseText);
        } catch (e) {
            throw new Error(`Failed to delete transaction: ${responseText}`);
        }
        throw new Error(error.error || 'Failed to delete transaction');
    }
};

export const addBudget = async (budget: Omit<Budget, 'id'>): Promise<string> => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('User not authenticated');
    const response = await fetch(`${getApiUrl()}/api/budgets`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(budget),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add budget');
    }
    const { id } = await response.json();
    return id;
};

export const updateBudget = async (id: string, budget: Budget): Promise<void> => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('User not authenticated');
    const response = await fetch(`${getApiUrl()}/api/budgets/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(budget),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add budget');
    }
};

export const deleteBudget = async (id: string): Promise<void> => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('User not authenticated');
    const response = await fetch(`${getApiUrl()}/api/budgets/${id}`, {
        method: 'DELETE',
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete budget');
    }
};

export const subscribeToUserTransactions = (
    userId: string,
    callback: (transactions: Transaction[]) => void
): Unsubscribe => {
    const transactionsRef = collection(firestore, 'transactions');
    const q = query(
        transactionsRef,
        where('userId', '==', userId),
        orderBy('date', 'desc')
    );
    return onSnapshot(
        q,
        (snapshot) => {
            const transactions = snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    date: timestampToString(data.date),
                } as Transaction;
            });
            callback(transactions);
        },
        (error) => {
            console.error('Error subscribing to transactions:', error);
        }
    );
};

export const subscribeToUserBudgets = (
    userId: string,
    callback: (budgets: Budget[]) => void
): Unsubscribe => {
    const budgetsRef = collection(firestore, 'budgets');
    const q = query(budgetsRef, where('userId', '==', userId));
    return onSnapshot(
        q,
        (snapshot) => {
            const budgets = snapshot.docs.map((doc) => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    startDate: timestampToString(data.startDate),
                } as Budget;
            });
            callback(budgets);
        },
        (error) => {
            console.error('Error subscribing to budgets:', error);
        }
    );
};