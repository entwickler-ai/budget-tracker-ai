// BudgetTrackerAi/src/screens/auth/RegisterScreen.tsx
import React, { useState, useEffect } from 'react';
import { Text, StyleSheet, View, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { signUp } from '@services/auth';
import { setUserRole } from '@services/user';
import Input from '@components/Input';
import Button from '@components/Button';
import { validateEmail } from '@utils/validateEmail';
import AuthLayout from '@components/AuthLayout';

type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
    ForgotPassword: undefined;
};

type NavigationProp = StackNavigationProp<AuthStackParamList, 'Register'>;

const Toast = ({ visible, message, duration = 3000, onHide }: { visible: boolean, message: string, duration?: number, onHide: () => void }) => {
    const [opacity] = useState(new Animated.Value(0));

    useEffect(() => {
        if (visible) {
            Animated.timing(opacity, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();

            const timer = setTimeout(() => {
                Animated.timing(opacity, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }).start(() => onHide());
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [visible]);

    if (!visible) return null;

    return (
        <Animated.View style={[styles.toastContainer, { opacity }]}>
            <Text style={styles.toastText}>{message}</Text>
        </Animated.View>
    );
};

const RegisterScreen = () => {
    const navigation = useNavigation<NavigationProp>();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    const handleRegister = async () => {
        if (!validateEmail(email)) {
            setError('Please enter a valid email');
            return;
        }
        if (!password) {
            setError('Please enter a password');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            const userCredential = await signUp(email, password);
            await setUserRole(userCredential.user, 'USER');

            navigation.navigate('Login');
        } catch (err: any) {
            setError(err.message || 'Failed to register');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout title="Create Account">
            <Input
                label="Email"
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
                error={error.includes('email') ? error : ''}
            />
            <Input
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter your password"
                secureTextEntry
                toggleSecure={true}
                error={error.includes('password') ? error : ''}
            />
            <Input
                label="Confirm Password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm your password"
                secureTextEntry
                toggleSecure={true}
                error={error.includes('password') ? error : ''}
            />
            {error && !error.includes('email') && !error.includes('password') ? (
                <Text style={styles.errorText}>{error}</Text>
            ) : null}
            <Button
                title="Sign Up"
                onPress={handleRegister}
                loading={loading}
                disabled={loading}
                style={styles.button}
            />
            <Text
                style={styles.link}
                onPress={() => navigation.navigate('Login')}
            >
                Already have an account? Sign In
            </Text>
            <Toast
                visible={toastVisible}
                message={toastMessage}
                duration={3000}
                onHide={() => setToastVisible(false)}
            />
        </AuthLayout>
    );
};

const styles = StyleSheet.create({
    button: {
        backgroundColor: '#007aff',
        borderRadius: 38,
        padding: 15,
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 20,
        width: '50%',
        left: '25%',
    },
    errorText: {
        color: '#FF3B30',
        fontSize: 14,
        marginBottom: 20,
        textAlign: 'center',
    },
    link: {
        color: '#007aff',
        fontWeight: 'bold',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 10,
    },
    toastContainer: {
        position: 'absolute',
        bottom: 50,
        left: '10%',
        right: '10%',
        backgroundColor: '#333',
        padding: 15,
        borderRadius: 10,
        alignItems: 'center',
    },
    toastText: {
        color: '#fff',
        fontSize: 16,
        textAlign: 'center',
    },
});

export default RegisterScreen;