// BudgetTrackerAi/src/hooks/useInsights.ts
import { useState, useCallback } from 'react';
import { getInsights } from '@services/api';
import { Transaction } from '@/types/finance';

export const useInsights = (userId: string) => {
    const [insights, setInsights] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchInsights = useCallback(
        async (query: string, transactions?: Transaction[]) => {
            if (!userId || !query) {
                setError('User ID and query are required');
                return null;
            }

            setLoading(true);
            setError('');

            try {
                const processedTransactions = transactions?.map((tx) => ({
                    amount: Number(tx.amount),
                    category: tx.category,
                    type: tx.type,
                    date: tx.date,
                    description: tx.description,
                    userId: tx.userId,
                }));

                const response = await getInsights({
                    query,
                    userId,
                    transactions: processedTransactions,
                });

                if (response.result) {
                    setInsights((prevInsights) => [response.result, ...prevInsights]);
                    return response.result;
                } else {
                    throw new Error('No result returned from API');
                }
            } catch (err: any) {
                const errorMessage = err.message || 'Failed to fetch insight';
                console.error('API error details:', err);
                setError(errorMessage);
                return null;
            } finally {
                setLoading(false);
            }
        },
        [userId]
    );

    const clearInsights = useCallback(() => {
        setInsights([]);
    }, []);

    return {
        insights,
        fetchInsights,
        clearInsights,
        loading,
        error,
    };
};