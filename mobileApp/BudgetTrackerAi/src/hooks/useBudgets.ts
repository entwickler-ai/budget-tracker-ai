// BudgetTrackerAi/src/hooks/useBudgets.ts
import { useState, useEffect } from 'react';
import { subscribeToUserBudgets, addBudget, updateBudget, deleteBudget } from '@services/database';
import { Budget } from '@/types/finance';

export const useBudgets = (userId: string) => {
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            setBudgets([]);
            setLoading(false);
            return;
        }

        const unsubscribe = subscribeToUserBudgets(userId, (data) => {
            setBudgets(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [userId]);

    const handleAddBudget = async (budget: Omit<Budget, 'id'>) => {
        try {
            await addBudget(budget);
        } catch (error) {
            console.error('Error adding budget:', error);
            throw error;
        }
    };

    const handleUpdateBudget = async (id: string, budget: Budget) => {
        try {
            await updateBudget(id, budget);
        } catch (error) {
            console.error('Error updating budget:', error);
            throw error;
        }
    };

    const handleDeleteBudget = async (id: string) => {
        try {
            await deleteBudget(id);
        } catch (error) {
            console.error('Error deleting budget:', error);
            throw error;
        }
    };

    return {
        budgets,
        loading,
        addBudget: handleAddBudget,
        updateBudget: handleUpdateBudget,
        deleteBudget: handleDeleteBudget,
    };
};