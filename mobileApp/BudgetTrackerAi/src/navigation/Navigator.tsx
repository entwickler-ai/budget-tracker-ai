// BudgetTrackerAi/src/navigation/Navigator.tsx
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { subscribeToAuthChanges } from '@services/auth';
import { User } from 'firebase/auth';
import LoginScreen from '@screens/auth/LoginScreen';
import RegisterScreen from '@screens/auth/RegisterScreen';
import DashboardScreen from '@screens/dashboard/DashboardScreen';
import TransactionsScreen from '@screens/transactions/TransactionsScreen';
import BudgetsScreen from '@screens/budgets/BudgetsScreen';
import InsightsScreen from '@screens/insights/InsightsScreen';
import SettingsScreen from '@screens/settings/SettingsScreen';
import AdminPanelScreen from '@screens/admin/AdminPanelScreen';

type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
};

type AppTabParamList = {
    Dashboard: undefined;
    Transactions: undefined;
    Budgets: undefined;
    Insights: undefined;
    Settings: undefined;
};

type RootStackParamList = {
    Auth: undefined;
    App: undefined;
    AdminPanel: undefined;
};

const AuthStack = createStackNavigator<AuthStackParamList>();
const AppTab = createBottomTabNavigator<AppTabParamList>();
const RootStack = createStackNavigator<RootStackParamList>();

const AuthNavigator = () => (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
        <AuthStack.Screen name="Login" component={LoginScreen} />
        <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
);

const AppNavigator = () => (
    <AppTab.Navigator
        screenOptions={({ route }) => ({
            tabBarIcon: ({ color, size }) => {
                let iconName: keyof typeof MaterialIcons.glyphMap;
                if (route.name === 'Dashboard') iconName = 'dashboard';
                else if (route.name === 'Transactions') iconName = 'receipt';
                else if (route.name === 'Budgets') iconName = 'account-balance-wallet';
                else if (route.name === 'Insights') iconName = 'insights';
                else iconName = 'settings';
                return <MaterialIcons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#007AFF',
            tabBarInactiveTintColor: '#6B7280',
            tabBarStyle: {
                backgroundColor: '#FFFFFF',
                borderTopColor: '#E5E7EB',
                borderTopWidth: 1,
                paddingBottom: 5,
                paddingTop: 5,
                height: 75,
            },
        })}
    >
        <AppTab.Screen
            name="Dashboard"
            component={DashboardScreen}
            options={{ title: 'Dashboard' }}
        />
        <AppTab.Screen
            name="Transactions"
            component={TransactionsScreen}
            options={{ title: 'Transactions' }}
        />
        <AppTab.Screen
            name="Budgets"
            component={BudgetsScreen}
            options={{ title: 'Budgets' }}
        />
        <AppTab.Screen
            name="Insights"
            component={InsightsScreen}
            options={{ title: 'Insights' }}
        />
        <AppTab.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: 'Settings' }}
        />
    </AppTab.Navigator>
);

const AppNavigation = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const unsubscribe = subscribeToAuthChanges((currentUser) => {
            setUser(currentUser);
            setIsLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (isLoading) {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#F9FAFB',
                }}
            >
                <Text style={{ fontSize: 16, color: '#6B7280' }}>Loading...</Text>
            </View>
        );
    }

    return (
        <NavigationContainer>
            <RootStack.Navigator screenOptions={{ headerShown: false }}>
                {user ? (
                    <>
                        <RootStack.Screen name="App" component={AppNavigator} />
                        <RootStack.Screen name="AdminPanel" component={AdminPanelScreen} />
                    </>
                ) : (
                    <RootStack.Screen name="Auth" component={AuthNavigator} />
                )}
            </RootStack.Navigator>
        </NavigationContainer>
    );
};

export default AppNavigation;