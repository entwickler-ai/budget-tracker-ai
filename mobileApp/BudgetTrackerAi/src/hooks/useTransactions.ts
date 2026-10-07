// BudgetTrackerAi/src/hooks/useTransactions.ts
import { useState, useEffect, useCallback } from 'react';
import {
    subscribeToUserTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
} from '@services/database';
import { Transaction } from '@/types/finance';
import { TransactionSummary, calculateTransactionSummary } from '@/utils/financeCalculations';

export type UseTransactionsReturn = {
    transactions: Transaction[];
    summary: TransactionSummary;
    loading: boolean;
    refreshing: boolean;
    onRefresh: () => Promise<void>;
    addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<void>;
    updateTransaction: (id: string, transaction: Transaction) => Promise<void>;
    deleteTransaction: (id: string) => Promise<void>;
};

export const useTransactions = (userId: string): UseTransactionsReturn => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [summary, setSummary] = useState<TransactionSummary>({
        income: 0,
        expenses: 0,
        balance: 0,
    });

    useEffect(() => {
        if (!userId) {
            setTransactions([]);
            setSummary({ income: 0, expenses: 0, balance: 0 });
            setLoading(false);
            return;
        }

        const unsubscribe = subscribeToUserTransactions(userId, (data) => {
            setTransactions(data);
            setSummary(calculateTransactionSummary(data));
            setLoading(false);
        });
        return () => unsubscribe();
    }, [userId]);

    const onRefresh = useCallback(async () => {
        if (!userId) return;
        setRefreshing(true);
        try {
            const unsubscribe = subscribeToUserTransactions(userId, (data) => {
                setTransactions(data);
                setSummary(calculateTransactionSummary(data));
            });
            setTimeout(() => unsubscribe(), 1000);
        } catch (error) {
            console.error('Error refreshing transactions:', error);
        } finally {
            setRefreshing(false);
        }
    }, [userId]);

    const handleAddTransaction = async (transaction: Omit<Transaction, 'id'>) => {
        try {
            await addTransaction(transaction);
        } catch (error) {
            console.error('Error adding transaction:', error);
            throw error;
        }
    };

    const handleUpdateTransaction = async (id: string, transaction: Transaction) => {
        try {
            await updateTransaction(id, transaction);
        } catch (error) {
            console.error('Error updating transaction:', error);
            throw error;
        }
    };

    const handleDeleteTransaction = async (id: string) => {
        try {
            await deleteTransaction(id);
        } catch (error) {
            console.error('Error deleting transaction:', error);
            throw error;
        }
    };

    return {
        transactions,
        summary,
        loading,
        refreshing,
        onRefresh,
        addTransaction: handleAddTransaction,
        updateTransaction: handleUpdateTransaction,
        deleteTransaction: handleDeleteTransaction,
    };
};