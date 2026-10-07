// BudgetTrackerAi/src/screens/auth/LoginScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert, Modal, Animated } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { signIn, resetPassword } from '@services/auth';
import Input from '@components/Input';
import Button from '@components/Button';
import { validateEmail } from '@utils/validateEmail';
import AuthLayout from '@components/AuthLayout';

type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
    ForgotPassword: undefined;
    ResetPassword: { oobCode: string };
};

type NavigationProp = StackNavigationProp<AuthStackParamList, 'Login'>;

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

const LoginScreen = () => {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resetModalVisible, setResetModalVisible] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [resetLoading, setResetLoading] = useState(false);
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    useEffect(() => {
        const registrationSuccess = (route.params as any)?.registrationSuccess;
        const registeredEmail = (route.params as any)?.email;

        if (registrationSuccess) {
            setEmail(registeredEmail || '');
            setToastMessage('Account created successfully! Please sign in.');
            setToastVisible(true);

            type AuthStackParamList = {
                Login: { registrationSuccess?: boolean; email?: string };
                Register: undefined;
                ForgotPassword: undefined;
                ResetPassword: { oobCode: string };
            };

        }
    }, [route.params]);

    const handleLogin = async () => {
        if (!validateEmail(email)) {
            setError('Please enter a valid email');
            return;
        }
        if (!password) {
            setError('Please enter a password');
            return;
        }

        setLoading(true);
        try {
            await signIn(email, password);
        } catch (err: any) {
            setError(err.message || 'Failed to sign in');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!validateEmail(resetEmail)) {
            setError('Please enter a valid email to reset your password');
            return;
        }

        setResetLoading(true);
        try {
            await resetPassword(resetEmail);

            type AuthStackParamList = {
                Login: { registrationSuccess?: boolean; email?: string };
                Register: undefined;
                ForgotPassword: undefined;
                ResetPassword: { oobCode: string; email?: string };
            };

            setResetModalVisible(false);
            setResetEmail('');
            setError('');
        } catch (err: any) {
            setError(err.message || 'Failed to send password reset email');
        } finally {
            setResetLoading(false);
        }
    };

    return (
        <AuthLayout title="Welcome Back">
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
            <Text
                style={styles.forgotPassword}
                onPress={() => setResetModalVisible(true)}
            >
                Forgot Password?
            </Text>
            {error && !error.includes('email') && !error.includes('password') ? (
                <Text style={styles.errorText}>{error}</Text>
            ) : null}
            <Button
                title="Sign In"
                onPress={handleLogin}
                loading={loading}
                disabled={loading || resetLoading}
                style={styles.button}
            />
            <Text
                style={styles.link}
                onPress={() => navigation.navigate('Register')}
            >
                Don't have an account? Sign Up
            </Text>

            <Modal
                visible={resetModalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setResetModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Reset Password</Text>
                        <Input
                            label="Email"
                            value={resetEmail}
                            onChangeText={setResetEmail}
                            placeholder="Enter your email"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            error={error.includes('email') ? error : ''}
                        />
                        {error && !error.includes('email') ? (
                            <Text style={styles.errorText}>{error}</Text>
                        ) : null}
                        <Button
                            title="Send Reset Email"
                            onPress={handleForgotPassword}
                            loading={resetLoading}
                            disabled={resetLoading}
                            style={styles.modalButton}
                        />
                        <Button
                            title="Cancel"
                            variant="outline"
                            onPress={() => {
                                setResetModalVisible(false);
                                setResetEmail('');
                                setError('');
                            }}
                            style={styles.cancelButton}
                        />
                    </View>
                </View>
            </Modal>

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
    forgotPassword: {
        color: '#007aff',
        fontSize: 14,
        textAlign: 'right',
        marginBottom: 20,
    },
    button: {
        backgroundColor: '#007aff',
        borderRadius: 38,
        padding: 15,
        alignItems: 'center',
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
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderRadius: 38,
        padding: 20,
        marginHorizontal: 20,
        marginBottom: 99,
    },
    modalTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#000000',
        marginBottom: 30,
        textAlign: 'center',
    },
    modalButton: {
        backgroundColor: '#007aff',
        borderRadius: 38,
        padding: 15,
        alignItems: 'center',
        marginBottom: 20,
        width: '50%',
        left: '25%',
    },
    cancelButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#007aff',
        borderRadius: 38,
        padding: 15,
        alignItems: 'center',
        width: '50%',
        left: '25%',
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

export default LoginScreen;