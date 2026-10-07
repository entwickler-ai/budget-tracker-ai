// BudgetTrackerAi/src/services/api.ts
import { auth } from './firebase';
import { InsightRequest, InsightResponse } from '@/types/finance';
import { Platform } from 'react-native';

export const getApiUrl = () => {
    if (Platform.OS === 'web') {
        return process.env.EXPO_PUBLIC_API_URL_WEB || 'http://localhost:3000';
    }
    return process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.122:3000';
};

export const getInsights = async (request: InsightRequest): Promise<InsightResponse> => {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('User not authenticated');
    const response = await fetch(`${getApiUrl()}/api/insights`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(request),
    });
    const text = await response.text();
    if (!response.ok) {
        let error;
        try {
            error = JSON.parse(text);
        } catch (e) {
            throw new Error(`Failed to fetch insights: ${text}`);
        }
        throw new Error(error.error || 'Failed to fetch insights');
    }
    return JSON.parse(text);
};