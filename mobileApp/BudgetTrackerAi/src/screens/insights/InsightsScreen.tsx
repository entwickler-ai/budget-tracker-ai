//BudgetTrackerAi/src/screens/insights/InsightsScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Platform,
    Clipboard,
    KeyboardAvoidingView,
    Keyboard,
    Image,
    Animated,
    Easing,
    Alert,
} from 'react-native';
import { useAuth } from '@hooks/useAuth';
import { useInsights } from '@hooks/useInsights';
import { useTransactions } from '@hooks/useTransactions';
import * as Haptics from 'expo-haptics';
import { MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';
import * as DocumentPicker from 'expo-document-picker';
import { DocumentPickerAsset } from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';

type ConversationMessage = {
    id: string;
    role: 'user' | 'ai';
    text: string;
    isEditing?: boolean;
    attachment?: DocumentPickerAsset;
};

const InsightsScreen = () => {
    const { user } = useAuth();
    const { insights: initialInsights, loading, error, fetchInsights } = useInsights(user?.uid || '');
    const { transactions } = useTransactions(user?.uid || '');
    const [query, setQuery] = useState('');
    const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [editValue, setEditValue] = useState('');
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [selectedAttachment, setSelectedAttachment] = useState<DocumentPickerAsset | null>(null);
    const scrollViewRef = useRef<ScrollView>(null);

    const rotation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isTyping) {
            Animated.loop(
                Animated.timing(rotation, {
                    toValue: 1,
                    duration: 1000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            ).start();
        } else {
            rotation.stopAnimation();
            rotation.setValue(0);
        }
    }, [isTyping, rotation]);

    const rotateInterpolate = rotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const rotateStyle = {
        transform: [{ rotate: rotateInterpolate }],
    };

    useEffect(() => {
        if (initialInsights && initialInsights.length > 0 && conversationHistory.length === 0) {
            const formattedInsights = initialInsights.map((insight, index) => ({
                id: `init-ai-${index}`,
                role: 'ai' as const,
                text: insight,
            }));

            setConversationHistory(formattedInsights);
        }
    }, [initialInsights, conversationHistory.length]);

    useEffect(() => {
        return () => {
            Speech.stop();
        };
    }, []);

    useEffect(() => {
        if (scrollViewRef.current) {
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [conversationHistory]);

    const generateUniqueId = () => {
        return Date.now().toString() + Math.random().toString(36).substring(2, 9);
    };

    // Cross-platform file reading function
    const readFileContent = async (fileUri: string): Promise<string> => {
        try {
            if (Platform.OS === 'web') {
                if (fileUri.startsWith('data:')) {
                    try {
                        const base64Content = fileUri.split(',')[1];
                        if (base64Content) {
                            const fileContent = atob(base64Content);
                            return fileContent.substring(0, 500) + '...';
                        }
                    } catch (e) {
                        console.error('Error decoding base64 file content:', e);
                    }
                }
                
                try {
                    const response = await fetch(fileUri);
                    const blob = await response.blob();
                    return new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = () => {
                            const content = reader.result as string;
                            resolve(content.substring(0, 500) + '...');
                        };
                        reader.readAsText(blob);
                    });
                } catch (fetchError) {
                console.error('Error fetching file content on web:', fetchError);
                if (fetchError instanceof Error) {
                    return `[File content could not be read - ${fetchError.message}]`;
                } else {
                    return `[File content could not be read - Unknown error]`;
                }
            }

                        } else {
                            const fileContent = await FileSystem.readAsStringAsync(fileUri);
                            return fileContent.substring(0, 500) + '...';
                        }
                    } catch (fileErr) {
                console.error('Error reading file:', fileErr);
                if (fileErr instanceof Error) {
                    return `[File content could not be read - ${fileErr.message}]`;
                } else {
                    return `[File content could not be read - Unknown error]`;
                }
            }
        
        return '[File content could not be read]';
    };

    const fetchInsightSafely = async (queryText: string, currentTransactions: any[], attachment: DocumentPickerAsset | null = null): Promise<string> => {
        try {
            let attachmentData = '';
            if (attachment) {
                try {
                    const fileContent = await readFileContent(attachment.uri);
                    attachmentData = `\n[Attachment: ${attachment.name}]\n${fileContent}`;
                } catch (fileErr) {
                    console.error('Error reading attachment:', fileErr);
                    attachmentData = `\n[Attachment: ${attachment.name} - Could not be read]`;
                }
            }

            const enhancedQuery = attachment ? queryText + attachmentData : queryText;

            const result = await fetchInsights(enhancedQuery, currentTransactions);
            return result || 'No insight available.';
        } catch (err) {
            console.error('Error fetching insight:', err);
            const errorMsg = err instanceof Error ? err.message : 'Failed to get insight.';
            return errorMsg;
        }
    };

    const handleSendMessage = async () => {
        if ((!query.trim() && !selectedAttachment) || isTyping || !user?.uid) return;

        if (Platform.OS !== 'web') {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        const currentQuery = query;
        const currentAttachment = selectedAttachment;

        const userMessage: ConversationMessage = {
            id: generateUniqueId(),
            role: 'user',
            text: currentQuery,
            attachment: currentAttachment || undefined,
        };

        setConversationHistory((prev) => {
            const newHistory = [...prev, userMessage];
            return newHistory;
        });

        setQuery('');
        setSelectedAttachment(null);
        setIsTyping(true);

        const result = await fetchInsightSafely(currentQuery, transactions, currentAttachment);

        const aiResponse: ConversationMessage = {
            id: generateUniqueId(),
            role: 'ai',
            text: result,
        };

        setConversationHistory((prev) => {
            const userMessageStillExists = prev.some((msg) => msg.role === 'user' && msg.text === currentQuery);
            const updatedHistory = userMessageStillExists ? prev : [...prev, userMessage];
            const newHistory = [...updatedHistory, aiResponse];
            return newHistory;
        });

        setIsTyping(false);
    };

    const handleCopyMessage = (text: string) => {
        Clipboard.setString(text);
        if (Platform.OS !== 'web') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    };

    const handleSpeakMessage = (text: string) => {
        if (isSpeaking) {
            Speech.stop();
            setIsSpeaking(false);
        } else {
            setIsSpeaking(true);
            Speech.speak(text, {
                language: 'de',
                onDone: () => setIsSpeaking(false),
                onError: () => {
                    setIsSpeaking(false);
                    Alert.alert('Fehler', 'Text konnte nicht vorgelesen werden.');
                }
            });
        }
    };

    // Updated pickDocument function with web platform handling
    const pickDocument = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                // For web, we may need to ensure the file is accessible
                const asset = result.assets[0];
                
                // Test if we can access the file content
                if (Platform.OS === 'web') {
                    try {
                        // Just verify we can access it, don't store the content yet
                        await readFileContent(asset.uri);
                    } catch (testError) {
                        console.error('Error verifying file access:', testError);
                        Alert.alert(
                            'File Access Issue',
                            'Unable to access the selected file. Please try a different file or format.',
                            [{ text: 'OK' }]
                        );
                        return;
                    }
                }
                
                setSelectedAttachment(asset);
            }
        } catch (err) {
            console.error('Error picking document:', err);
            Alert.alert('Error', 'Could not select file.');
        }
    };

    const startEditMessage = (messageId: string, text: string) => {
        setConversationHistory((prev) =>
            prev.map((msg) =>
                msg.id === messageId ? { ...msg, isEditing: true } : msg
            )
        );
        setEditValue(text);
    };

    const cancelEditMessage = (messageId: string) => {
        setConversationHistory((prev) =>
            prev.map((msg) =>
                msg.id === messageId ? { ...msg, isEditing: false } : msg
            )
        );
        setEditValue('');
    };

    const saveEditMessage = async (messageId: string) => {
        if (!editValue.trim() || !user?.uid) return;

        const messageIndex = conversationHistory.findIndex((msg) => msg.id === messageId);
        if (messageIndex === -1) return;

        const message = conversationHistory[messageIndex];
        if (message.role !== 'user') return;

        const updatedHistory = [...conversationHistory];
        updatedHistory[messageIndex] = {
            ...message,
            text: editValue,
            isEditing: false,
        };

        const newHistory = updatedHistory.slice(0, messageIndex + 1);
        setConversationHistory(newHistory);
        setEditValue('');

        if (
            messageIndex === conversationHistory.length - 1 ||
            (messageIndex === conversationHistory.length - 2 &&
                conversationHistory[messageIndex + 1].role === 'ai')
        ) {
            setIsTyping(true);

            const result = await fetchInsightSafely(editValue, transactions, message.attachment);

            const aiResponse: ConversationMessage = {
                id: generateUniqueId(),
                role: 'ai',
                text: result,
            };

            setConversationHistory((prev) => {
                const editedMessageExists = prev.some((msg) => msg.id === messageId);
                const baseHistory = editedMessageExists ? prev : newHistory;
                return [...baseHistory, aiResponse];
            });

            setIsTyping(false);
        }
    };

    if (!user) {
        return (
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <LinearGradient colors={['#F9FAFB', '#E5E7EB']} style={styles.container}>
                    <Text style={styles.emptyText}>Please sign in to view insights.</Text>
                </LinearGradient>
            </KeyboardAvoidingView>
        );
    }

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
        >
            <LinearGradient colors={['#F9FAFB', '#E5E7EB']} style={styles.container}>
                <Image
                    source={require('../../assets/icon.png')}
                    style={[styles.statusIcon, { borderRadius: 55 }]}
                    resizeMode="contain"
                />
                <Text style={styles.title}>Financial Insights</Text>
                <ScrollView
                    style={styles.chatContainer}
                    ref={scrollViewRef}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {conversationHistory.length === 0 && !loading ? (
                        <Text style={styles.emptyText}>Start by asking a financial question!</Text>
                    ) : (
                        conversationHistory.map((msg) => (
                            <View
                                key={msg.id}
                                style={[
                                    styles.messageBubbleContainer,
                                    msg.role === 'user'
                                        ? styles.userBubbleContainer
                                        : styles.aiBubbleContainer,
                                ]}
                            >
                                {msg.isEditing ? (
                                    <View style={styles.editContainer}>
                                        <TextInput
                                            style={styles.editInput}
                                            value={editValue}
                                            onChangeText={setEditValue}
                                            multiline
                                            autoFocus
                                        />
                                        <View style={styles.editButtonsContainer}>
                                            <TouchableOpacity
                                                style={styles.editButton}
                                                onPress={() => cancelEditMessage(msg.id)}
                                            >
                                                <Feather name="x" size={18} color="#EF4444" />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.editButton}
                                                onPress={() => saveEditMessage(msg.id)}
                                            >
                                                <Feather name="check" size={18} color="#10B981" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ) : (
                                    <View style={styles.messageWrapper}>
                                        <View
                                            style={[
                                                styles.messageBubble,
                                                msg.role === 'user'
                                                    ? styles.userBubble
                                                    : styles.aiBubble,
                                            ]}
                                        >
                                            <Text style={styles.messageText}>{msg.text}</Text>
                                            {msg.attachment && (
                                                <View style={styles.attachmentInfo}>
                                                    <Feather name="paperclip" size={14} color="#FFFFFF" />
                                                    <Text style={styles.attachmentText}>
                                                        {msg.attachment.name}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                        <View style={styles.messageActions}>
                                            <TouchableOpacity
                                                style={styles.actionButton}
                                                onPress={() => handleCopyMessage(msg.text)}
                                            >
                                                <Feather name="copy" size={16} color="#6B7280" />
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.actionButton}
                                                onPress={() => handleSpeakMessage(msg.text)}
                                            >
                                                <Feather
                                                    name={isSpeaking ? "volume-x" : "volume-2"}
                                                    size={16}
                                                    color="#6B7280"
                                                />
                                            </TouchableOpacity>
                                            {msg.role === 'user' && (
                                                <TouchableOpacity
                                                    style={styles.actionButton}
                                                    onPress={() => startEditMessage(msg.id, msg.text)}
                                                >
                                                    <Feather name="edit-2" size={16} color="#6B7280" />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
                                )}
                            </View>
                        ))
                    )}

                    {/* Show rotating icon instead of "Generating insight..." */}
                    {isTyping && (
                        <View style={[styles.messageBubble, styles.aiBubble, styles.loadingBubble]}>
                            <Animated.Image
                                source={require('../../assets/icon.png')}
                                style={[styles.loadingIcon, rotateStyle]}
                                resizeMode="contain"
                            />
                        </View>
                    )}

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}
                </ScrollView>

                <View style={styles.inputContainer}>
                    {selectedAttachment && (
                        <View style={styles.attachmentPreview}>
                            <Text style={styles.attachmentPreviewText} numberOfLines={1}>
                                {selectedAttachment.name}
                            </Text>
                            <TouchableOpacity
                                style={styles.removeAttachmentButton}
                                onPress={() => setSelectedAttachment(null)}
                            >
                                <Feather name="x" size={16} color="#6B7280" />
                            </TouchableOpacity>
                        </View>
                    )}
                    <View style={styles.inputRow}>
                        <TouchableOpacity
                            style={styles.attachButton}
                            onPress={pickDocument}
                            disabled={isTyping}
                        >
                            <Feather
                                name="paperclip"
                                size={20}
                                color={isTyping ? '#6B7280' : '#007AFF'}
                            />
                        </TouchableOpacity>
                        <TextInput
                            style={styles.input}
                            value={query}
                            onChangeText={setQuery}
                            placeholder="Ask about your finances (e.g., 'What's my food budget?', Wetter in Berlin?, Was ist das? (Anhang) ...)"
                            placeholderTextColor="#6B7280"
                            multiline
                            editable={!isTyping}
                            onSubmitEditing={() => {
                                handleSendMessage();
                                Keyboard.dismiss();
                            }}
                        />
                        <TouchableOpacity
                            style={[
                                styles.sendButton,
                                (isTyping || (!query.trim() && !selectedAttachment)) && styles.disabledButton,
                            ]}
                            onPress={() => {
                                handleSendMessage();
                                Keyboard.dismiss();
                            }}
                            disabled={isTyping || (!query.trim() && !selectedAttachment)}
                        >
                            <MaterialIcons
                                name="send"
                                size={24}
                                color={isTyping || (!query.trim() && !selectedAttachment) ? '#6B7280' : '#007AFF'}
                            />
                        </TouchableOpacity>
                    </View>
                </View>
            </LinearGradient>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    title: {
        fontSize: 28,
        marginLeft: Platform.OS === 'ios' ? 120 : 0,
        marginTop: Platform.OS === 'ios' ? -60 : 0,
        fontWeight: '700',
        color: '#1F2937',
        textAlign: 'center',
        fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    chatContainer: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    emptyText: {
        fontSize: 16,
        marginLeft: Platform.OS === 'ios' ? 120 : 0,
        marginTop: Platform.OS === 'ios' ? 10 : 0,
        color: '#6B7280',
        textAlign: 'center',
        fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    messageBubbleContainer: {
        marginVertical: 4,
        maxWidth: '80%',
    },
    userBubbleContainer: {
        alignSelf: 'flex-end',
        marginRight: 10,
    },
    aiBubbleContainer: {
        alignSelf: 'flex-start',
        marginLeft: 10,
    },
    messageWrapper: {
        flexDirection: 'column',
    },
    messageBubble: {
        padding: 12,
        borderRadius: 12,
    },
    userBubble: {
        backgroundColor: '#007AFF',
    },
    aiBubble: {
        backgroundColor: '#34C759',
    },
    loadingBubble: {
        alignSelf: 'flex-start',
        marginLeft: 10,
        marginTop: 8,
        backgroundColor: 'transparent',
    },
    messageText: {
        fontSize: 16,
        color: '#FFFFFF',
        fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    messageActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 4,
    },
    actionButton: {
        padding: 4,
        marginLeft: 8,
    },
    editContainer: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    editInput: {
        fontSize: 16,
        color: '#1F2937',
        padding: 8,
        fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
        minHeight: 60,
    },
    editButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 4,
    },
    editButton: {
        padding: 8,
        marginLeft: 8,
    },
    inputContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 8,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
        marginBottom: 22,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: '#1F2937',
        paddingVertical: 8,
        paddingHorizontal: 12,
        fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    sendButton: {
        padding: 8,
    },
    attachButton: {
        padding: 8,
    },
    errorText: {
        fontSize: 14,
        color: '#DC2626',
        textAlign: 'center',
        marginTop: 10,
        fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    disabledButton: {
        opacity: 0.5,
    },
    statusIcon: {
        width: 60,
        height: 60,
        marginRight: 12,
    },
    loadingIcon: {
        width: 30,
        height: 30,
        borderRadius: 55,
    },
    attachmentPreview: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        padding: 8,
        marginBottom: 8,
        alignItems: 'center',
    },
    attachmentPreviewText: {
        flex: 1,
        fontSize: 14,
        color: '#4B5563',
        fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
    removeAttachmentButton: {
        padding: 4,
    },
    attachmentInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        paddingTop: 4,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.3)',
    },
    attachmentText: {
        fontSize: 12,
        color: '#FFFFFF',
        marginLeft: 4,
        fontFamily: Platform.OS === 'ios' ? 'System' : 'Roboto',
    },
});

export default InsightsScreen;