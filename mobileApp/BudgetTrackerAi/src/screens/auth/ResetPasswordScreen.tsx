// BudgetTrackerAi/src/screens/auth/ResetPasswordScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { verifyPasswordResetCode, confirmPasswordReset } from '@services/auth';
import Input from '@components/Input';
import Button from '@components/Button';
import AuthLayout from '@components/AuthLayout';

type AuthStackParamList = {
    Login: undefined;
    Register: undefined;
    ForgotPassword: undefined;
    ResetPassword: { oobCode?: string, email?: string };
};

type NavigationProp = StackNavigationProp<AuthStackParamList, 'ResetPassword'>;

const ResetPasswordScreen = () => {
    const navigation = useNavigation<NavigationProp>();
    const route = useRoute();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [oobCode, setOobCode] = useState<string | null>(null);
    const [email, setEmail] = useState<string | null>(null);

    useEffect(() => {
        const routeParams = route.params as any;

        const code = routeParams?.oobCode;
        const emailParam = routeParams?.email;

        if (code) {
            setOobCode(code);
            verifyPasswordResetCode(code)
                .then(email => {
                    setEmail(email);
                })
                .catch((err) => {
                    setError('Invalid or expired reset link. Please try again.');
                });
        } else if (emailParam) {
            setEmail(emailParam);
            setError('Check your email for the password reset link and follow the instructions there.');
        } else {
            setError('No reset link provided. Please use the link from your email.');
        }
    }, [route.params]);

    const handleResetPassword = async () => {
        if (!newPassword || newPassword.length < 6) {
            setError('Password must be at least 6 characters long');
            return;
        }
        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (!oobCode) {
            setError('Invalid reset link');
            return;
        }

        setLoading(true);
        try {
            await confirmPasswordReset(oobCode, newPassword);
            Alert.alert(
                'Success',
                'Your password has been reset. Please sign in with your new password.',
                [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
            );
        } catch (err: any) {
            setError(err.message || 'Error resetting password');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AuthLayout title="Reset Password">
            {email && oobCode ? (
                <>
                    <Input
                        label="New Password"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        placeholder="Enter your new password"
                        secureTextEntry
                        toggleSecure={true}
                        error={error.includes('Password') ? error : ''}
                    />
                    <Input
                        label="Confirm Password"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="Confirm your new password"
                        secureTextEntry
                        toggleSecure={true}
                        error={error.includes('Passwords') ? error : ''}
                    />
                    <Button
                        title="Reset Password"
                        onPress={handleResetPassword}
                        loading={loading}
                        disabled={loading}
                        style={styles.button}
                    />
                </>
            ) : (
                <View style={styles.messageContainer}>
                    <Text style={styles.infoText}>
                        {email ? "We've sent a password reset link to your email address." : ""}
                    </Text>
                    {error ? <Text style={styles.errorText}>{error}</Text> : null}
                    <Button
                        title="Back to Login"
                        onPress={() => navigation.navigate('Login')}
                        style={StyleSheet.flatten([styles.button, styles.backButton])}
                    />
                </View>
            )}
        </AuthLayout>
    );
};

const styles = StyleSheet.create({
    button: {
        backgroundColor: '#007aff',
        borderRadius: 38,
        padding: 15,
        alignItems: 'center',
        marginBottom: 20,
        width: '50%',
        left: '25%',
    },
    backButton: {
        marginTop: 20,
    },
    errorText: {
        color: '#FF3B30',
        fontSize: 14,
        marginBottom: 20,
        textAlign: 'center',
    },
    messageContainer: {
        padding: 20,
        marginTop: 20,
    },
    infoText: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
        color: '#333',
    },
});

export default ResetPasswordScreen;