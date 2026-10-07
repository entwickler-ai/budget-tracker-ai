// BudgetTrackerAi/src/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { subscribeToAuthChanges, getCurrentUser } from '@services/auth';

export const useAuth = () => {
    const [user, setUser] = useState<User | null>(getCurrentUser());
    const [authLoading, setAuthLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = subscribeToAuthChanges((currentUser) => {
            setUser(currentUser);
            setAuthLoading(false);
        });
        return () => unsubscribe();
    }, []);

    return { user, authLoading };
};