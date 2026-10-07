// BudgetTrackerAi/src/services/auth.ts
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut as firebaseSignOut,
    UserCredential,
    sendPasswordResetEmail,
    onAuthStateChanged,
    User,
    fetchSignInMethodsForEmail,
    verifyPasswordResetCode as firebaseVerifyPasswordResetCode,
    confirmPasswordReset as firebaseConfirmPasswordReset,
} from 'firebase/auth';
import { auth } from './firebase';

export const signUp = async (email: string, password: string): Promise<UserCredential> => {
    const signInMethods = await fetchSignInMethodsForEmail(auth, email);
    if (signInMethods.length > 0) {
        throw new Error('This email is already registered or was previously deleted');
    }
    return await createUserWithEmailAndPassword(auth, email, password);
};

export const signIn = async (email: string, password: string): Promise<UserCredential> => {
    return await signInWithEmailAndPassword(auth, email, password);
};

export const signOut = async (): Promise<void> => {
    return await firebaseSignOut(auth);
};

export const resetPassword = async (email: string): Promise<void> => {
    return await sendPasswordResetEmail(auth, email);
};

export const verifyPasswordResetCode = async (code: string): Promise<string> => {
    return await firebaseVerifyPasswordResetCode(auth, code);
};

export const confirmPasswordReset = async (code: string, newPassword: string): Promise<void> => {
    return await firebaseConfirmPasswordReset(auth, code, newPassword);
};

export const subscribeToAuthChanges = (callback: (user: User | null) => void): (() => void) => {
    return onAuthStateChanged(auth, callback);
};

export const getCurrentUser = (): User | null => {
    return auth.currentUser;
};