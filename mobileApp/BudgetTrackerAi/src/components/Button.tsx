// BudgetTrackerAi/src/components/Button.tsx
import React from 'react';
import {
    TouchableOpacity,
    Text,
    StyleSheet,
    ActivityIndicator,
    ViewStyle,
    TextStyle
} from 'react-native';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
    size?: 'small' | 'medium' | 'large';
    loading?: boolean;
    disabled?: boolean;
    style?: ViewStyle;
    textStyle?: TextStyle;
    children?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
                                           title,
                                           onPress,
                                           variant = 'primary',
                                           size = 'medium',
                                           loading = false,
                                           disabled = false,
                                           style,
                                           textStyle,
                                       }) => {

    const getButtonStyle = () => {
        switch (variant) {
            case 'secondary':
                return styles.secondaryButton;
            case 'outline':
                return styles.outlineButton;
            case 'primary':
            default:
                return styles.primaryButton;
        }
    };

    const getTextStyle = () => {
        switch (variant) {
            case 'outline':
                return styles.outlineButtonText;
            case 'secondary':
            case 'primary':
            default:
                return styles.buttonText;
        }
    };

    const getSizeStyle = () => {
        switch (size) {
            case 'small':
                return styles.smallButton;
            case 'large':
                return styles.largeButton;
            case 'medium':
            default:
                return styles.mediumButton;
        }
    };

    return (
        <TouchableOpacity
            style={[
                styles.button,
                getButtonStyle(),
                getSizeStyle(),
                disabled && styles.disabledButton,
                style,
            ]}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.8}
        >
            {loading ? (
                <ActivityIndicator
                    color={variant === 'outline' ? '#007AFF' : '#007AFF'}
                    size="small"
                />
            ) : (
                <Text style={[getTextStyle(), textStyle]}>{title}</Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    primaryButton: {
        backgroundColor: '#007AFF',
    },
    secondaryButton: {
        backgroundColor: '#10B981',
    },
    outlineButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#007AFF',
    },
    smallButton: {
        height: 36,
        paddingHorizontal: 12,
    },
    mediumButton: {
        height: 50,
        paddingHorizontal: 16,
    },
    largeButton: {
        height: 56,
        paddingHorizontal: 20,
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    outlineButtonText: {
        color: '#007AFF',
        fontSize: 16,
        fontWeight: '600',
    },
    disabledButton: {
        opacity: 0.5,
    },
});

export default Button;