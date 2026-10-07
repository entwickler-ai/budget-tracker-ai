// BudgetTrackerAi/src/services/user.ts
import { db } from './firebase';
import { doc, setDoc, getDoc, collection, getDocs, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { signUp } from './auth';
import { User } from 'firebase/auth';

export type UserRole = 'ADMIN' | 'USER';

export interface UserData {
    uid: string;
    email: string;
    role: UserRole;
    name?: string;
    createdAt?: Timestamp;
}

export const getAllUsers = async (): Promise<UserData[]> => {
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map(doc => doc.data() as UserData);
};

export const createUser = async (email: string, password: string, role: UserRole, name?: string): Promise<UserData> => {
    const { user } = await signUp(email, password);
    try {
        await setUserRole(user, role, name);
        return { uid: user.uid, email: user.email || email, role, name: name || '', createdAt: Timestamp.now() };
    } catch (error) {
        console.error('Failed to create user document:', error);
        throw new Error('Failed to set up user profile');
    }
};

export const updateUserRole = async (uid: string, role: UserRole): Promise<void> => {
    await updateDoc(doc(db, 'users', uid), { role });
};

export const deleteUser = async (uid: string): Promise<void> => {
    const userRef = doc(db, 'users', uid);
    await deleteDoc(userRef);
};

export const setUserRole = async (user: User, role: UserRole, name?: string): Promise<void> => {
    const userRef = doc(db, 'users', user.uid);
    try {
        await setDoc(userRef, {
            uid: user.uid,
            email: user.email || '',
            role,
            name: name || user.displayName || '',
            createdAt: Timestamp.now(),
        }, { merge: true });
    } catch (error) {
        console.error('Error setting user role:', error);
        throw error;
    }
};

export const getUserRole = async (uid: string): Promise<UserRole | null> => {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    return userSnap.exists() ? userSnap.data().role as UserRole : null;
};

export const updateUserName = async (uid: string, name: string): Promise<void> => {
    await updateDoc(doc(db, 'users', uid), { name });
};

export const checkUserExists = async (uid: string): Promise<boolean> => {
    const userSnap = await getDoc(doc(db, 'users', uid));
    return userSnap.exists();
};