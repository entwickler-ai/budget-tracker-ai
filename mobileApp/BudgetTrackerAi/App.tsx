// BudgetTrackerAi/App.tsx
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigation from './src/navigation/Navigator';

export default function App() {
    return (
        <SafeAreaProvider>
            <AppNavigation />
            <StatusBar style="auto" />
        </SafeAreaProvider>
    );
}