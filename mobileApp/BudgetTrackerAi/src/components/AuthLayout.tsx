// BudgetTrackerAi/src/components/AuthLayout.tsx
import React from 'react';
import { View, Text, Image, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';

interface AuthLayoutProps {
    title: string;
    children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ title, children }) => (
    <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
        <StatusBar style="dark" />
        <View style={styles.logoContainer}>
            <Image
                source={require('../assets/icon.png')}
                style={[styles.logo, { borderRadius: 55 }]}
                resizeMode="contain"
            />
            <Text style={styles.appName}>BudgetTrackerAI</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        {children}
    </KeyboardAvoidingView>
);

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9f9f9',
        paddingHorizontal: 20,
        justifyContent: 'center',
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    logo: {
        width: 80,
        height: 80,
        marginTop: 80,
        marginBottom: 3,
    },
    appName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#000000',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#000000',
        marginBottom: 20,
        textAlign: 'center',
    },
});

export default AuthLayout;