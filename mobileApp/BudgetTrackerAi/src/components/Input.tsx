// BudgetTrackerAi/src/components/Input.tsx
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    StyleProp,
    TextStyle,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface InputProps {
    label?: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    secureTextEntry?: boolean;
    keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    error?: string;
    toggleSecure?: boolean;
    style?: StyleProp<TextStyle>;
    textStyle?: StyleProp<TextStyle>;
    autoFocus?: boolean;
}

const Input: React.FC<InputProps> = ({
                                         label,
                                         value,
                                         onChangeText,
                                         placeholder,
                                         secureTextEntry = false,
                                         keyboardType = 'default',
                                         autoCapitalize = 'sentences',
                                         error,
                                         toggleSecure = false,
                                         style,
                                         textStyle,
                                         autoFocus = false,
                                     }) => {
    const [isSecure, setIsSecure] = useState(secureTextEntry);

    return (
        <View style={styles.container}>
            {label && <Text style={styles.label}>{label}</Text>}
            <View style={[styles.inputContainer, error ? styles.inputError : null]}>
                <TextInput
                    style={[styles.input, textStyle, style]}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    secureTextEntry={toggleSecure ? isSecure : secureTextEntry}
                    keyboardType={keyboardType}
                    autoCapitalize={autoCapitalize}
                    placeholderTextColor="#6B7280"
                    autoFocus={autoFocus}
                    multiline={false}
                    returnKeyType="done"
                />
                {toggleSecure && (
                    <TouchableOpacity
                        style={styles.toggleButton}
                        onPress={() => setIsSecure(!isSecure)}
                    >
                        <Icon
                            name={isSecure ? 'visibility-off' : 'visibility'}
                            size={24}
                            color="#6B7280"
                        />
                    </TouchableOpacity>
                )}
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
        width: '100%',
    },
    label: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 8,
        color: '#1F2937',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    input: {
        flex: 1,
        height: 40,
        paddingHorizontal: 6,
        paddingVertical: 2,
        fontSize: 18,
        color: '#1F2937',
    },
    inputError: {
        borderColor: '#EF4444',
    },
    errorText: {
        color: '#EF4444',
        fontSize: 14,
        marginTop: 4,
    },
    toggleButton: {
        padding: 10,
    },
});

export default Input;