// BudgetTrackerAi/src/hooks/useUserRole.ts
import { useState, useEffect } from 'react';
import { getUserRole, checkUserExists } from '@services/user';
import { subscribeToAuthChanges, signOut } from '@services/auth';

export const useUserRole = () => {
    const [role, setRole] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = subscribeToAuthChanges(async (user) => {
            if (user) {
                try {
                    const exists = await checkUserExists(user.uid);
                    if (!exists) {
                        await signOut();
                        setError('Your account has been deleted');
                        setRole(null);
                    } else {
                        const userRole = await getUserRole(user.uid);
                        setRole(userRole);
                        setError(null);
                    }
                } catch (err: any) {
                    setError(err.message || 'Failed to fetch user role');
                    setRole(null);
                } finally {
                    setLoading(false);
                }
            } else {
                setRole(null);
                setError(null);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    return { role, loading, error };
};
