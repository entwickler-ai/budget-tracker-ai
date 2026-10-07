// BudgetTrackerAi/src/services/userProfile.ts
import { db, auth } from './firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { UserData } from './user';

export const getUserProfile = async (): Promise<UserData | null> => {
    if (!auth.currentUser) return null;
    try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            return userSnap.data() as UserData;
        }
        return null;
    } catch (error) {
        console.error('Error getting user profile:', error);
        throw error;
    }
};

export const updateUserProfile = async (name: string): Promise<void> => {
    if (!auth.currentUser) throw new Error('No authenticated user');
    try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, { name });
    } catch (error) {
        console.error('Error updating user profile:', error);
        throw error;
    }
};