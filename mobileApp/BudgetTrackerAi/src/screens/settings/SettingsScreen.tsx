//BudgetTrackerAi/src/screens/settings/SettingsScreen.tsx
import React, { useState, useEffect, useMemo, JSX } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Alert,
    SafeAreaView,
    ScrollView,
    TouchableOpacity,
    Platform,
    Modal,
    FlatList,
    TextInput,
    KeyboardAvoidingView,
    Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { signOut } from '@services/auth';
import { useUserRole } from '@hooks/useUserRole';
import { getUserProfile, updateUserProfile } from '@services/userProfile';
import Input from '@components/Input';
import { UserData } from '@services/user';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@hooks/useAuth';
import { useBudgets } from '@hooks/useBudgets';
import { useTransactions } from '@hooks/useTransactions';
import { timestampToString, BudgetCategory } from '@/types/finance';
import { CATEGORIES, CATEGORY_CONFIG } from '@/constants/categories';
import { MaterialIcons } from '@expo/vector-icons';
import Button from '@components/Button';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

type RootStackParamList = {
    Settings: undefined;
    AdminPanel: undefined;
};

type NavigationProp = StackNavigationProp<RootStackParamList, 'Settings'>;

const normalizeDateToUTCStart = (date: Date): Date => {
    const normalized = new Date(date);
    normalized.setUTCHours(0, 0, 0, 0);
    return normalized;
};

const normalizeDateToUTCEnd = (date: Date): Date => {
    const normalized = new Date(date);
    normalized.setUTCHours(23, 59, 59, 999);
    return normalized;
};

const CustomCalendar = ({
                            selectedDate,
                            onDateSelect,
                            onClose,
                        }: {
    selectedDate: Date | null;
    onDateSelect: (date: Date) => void;
    onClose: () => void;
}) => {
    const [currentMonth, setCurrentMonth] = useState(selectedDate ? selectedDate.getMonth() : new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(selectedDate ? selectedDate.getFullYear() : new Date().getFullYear());

    const daysInMonth = (month: number, year: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (month: number, year: number) => new Date(year, month, 1).getDay();

    const handlePrevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const handleNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };

    const handleDayPress = (day: number) => {
        const newDate = new Date(currentYear, currentMonth, day);
        onDateSelect(newDate);
        onClose();
    };

    const renderDays = () => {
        const daysCount = daysInMonth(currentMonth, currentYear);
        const firstDay = firstDayOfMonth(currentMonth, currentYear);
        const daysArray: JSX.Element[] = [];

        for (let i = 0; i < firstDay; i++) {
            daysArray.push(<View key={`empty-${i}`} style={styles.dayEmpty} />);
        }

        for (let day = 1; day <= daysCount; day++) {
            const isSelected =
                selectedDate &&
                selectedDate.getDate() === day &&
                selectedDate.getMonth() === currentMonth &&
                selectedDate.getFullYear() === currentYear;
            daysArray.push(
                <TouchableOpacity
                    key={`day-${day}`}
                    style={[styles.day, isSelected && styles.daySelected]}
                    onPress={() => handleDayPress(day)}
                >
                    <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>{day}</Text>
                </TouchableOpacity>
            );
        }

        return daysArray;
    };

    return (
        <View style={styles.calendarContainer}>
            <View style={styles.calendarHeader}>
                <TouchableOpacity onPress={handlePrevMonth}>
                    <MaterialIcons name="chevron-left" size={24} color="#007AFF" />
                </TouchableOpacity>
                <Text style={styles.calendarTitle}>
                    {new Date(currentYear, currentMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}
                </Text>
                <TouchableOpacity onPress={handleNextMonth}>
                    <MaterialIcons name="chevron-right" size={24} color="#007AFF" />
                </TouchableOpacity>
            </View>
            <View style={styles.daysHeader}>
                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day, index) => (
                    <Text key={index} style={styles.dayHeaderText}>
                        {day}
                    </Text>
                ))}
            </View>
            <ScrollView style={styles.daysScrollContainer}>
                <View style={styles.daysContainer}>{renderDays()}</View>
            </ScrollView>
            <Button title="Close" onPress={onClose} style={styles.calendarCloseButton} />
        </View>
    );
};

const Toast = ({ message, visible, onHide }: { message: string; visible: boolean; onHide: () => void }) => {
    const [fadeAnim] = useState(new Animated.Value(0));

    useEffect(() => {
        if (visible) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start();

            const timer = setTimeout(() => {
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }).start(() => onHide());
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [visible, fadeAnim, onHide]);

    if (!visible) return null;

    return (
        <Animated.View style={[styles.toastContainer, { opacity: fadeAnim }]}>
            <Text style={styles.toastText}>{message}</Text>
        </Animated.View>
    );
};

const SettingsScreen = () => {
    const navigation = useNavigation<NavigationProp>();
    const { role, loading: roleLoading } = useUserRole();
    const { user, authLoading } = useAuth();
    const userId = user?.uid || '';
    const { budgets } = useBudgets(userId);
    const { transactions } = useTransactions(userId);
    const [profile, setProfile] = useState<UserData | null>(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [editName, setEditName] = useState('');
    const [notificationModalVisible, setNotificationModalVisible] = useState(false);
    const [helpModalVisible, setHelpModalVisible] = useState(false);
    const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
    const [filterCategory, setFilterCategory] = useState<BudgetCategory | null>(null);
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [minLimit, setMinLimit] = useState('');
    const [maxLimit, setMaxLimit] = useState('');
    const [filterDate, setFilterDate] = useState<Date | null>(null);
    const [showCalendar, setShowCalendar] = useState(false);
    const [toastVisible, setToastVisible] = useState(false);
    const [toastMessage, setToastMessage] = useState('');

    useEffect(() => {
        if (!authLoading) {
            fetchProfile();
        }
    }, [authLoading]);

    const fetchProfile = async () => {
        try {
            const userProfile = await getUserProfile();
            setProfile(userProfile);
            setEditName(userProfile?.name || '');
        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSignOut = () => {
        const message = Platform.OS === 'web' ? "Do you want to log out?" : "Möchtest du dich wirklich abmelden?";
        const confirmLogout = Platform.OS === 'web'
            ? () => window.confirm(message) && performSignOut()
            : () => Alert.alert("Log Out", message, [
                { text: "Abbrechen", style: "cancel" },
                { text: "Abmelden", onPress: performSignOut, style: "destructive" }
            ]);

        confirmLogout();
    };

    const performSignOut = async () => {
        try {
            await signOut();
        } catch (error) {
            console.error('Sign out error:', error);
        }
    };

    const handleUpdateProfile = async () => {
        if (!editName.trim()) {
            Alert.alert('Error', 'Please enter a name');
            return;
        }

        try {
            await updateUserProfile(editName);
            setProfile(prev => prev ? { ...prev, name: editName } : prev);
            setEditMode(false);
            setToastMessage('Profile updated successfully');
            setToastVisible(true);
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to update profile');
        }
    };

    const exceededBudgets = useMemo(() => {
        const exceeded: Array<{
            id: string;
            category: BudgetCategory;
            limit: number;
            totalSpent: number;
            startDate: string;
            period: 'weekly' | 'monthly' | 'yearly';
        }> = [];

        budgets.forEach((budget) => {
            const budgetStartRaw = new Date(timestampToString(budget.startDate));
            const budgetStart = normalizeDateToUTCStart(budgetStartRaw);
            let periodEnd: Date;

            switch (budget.period) {
                case 'weekly':
                    periodEnd = new Date(budgetStart);
                    periodEnd.setUTCDate(budgetStart.getUTCDate() + 7);
                    break;
                case 'monthly':
                    periodEnd = new Date(budgetStart);
                    periodEnd.setUTCMonth(budgetStart.getUTCMonth() + 1);
                    break;
                case 'yearly':
                    periodEnd = new Date(budgetStart);
                    periodEnd.setUTCFullYear(budgetStart.getUTCFullYear() + 1);
                    break;
                default:
                    periodEnd = new Date();
            }
            periodEnd = normalizeDateToUTCEnd(periodEnd);

            const relevantTransactions = transactions.filter((tx) => {
                const txDate = normalizeDateToUTCStart(new Date(timestampToString(tx.date)));
                const matchesCategory = tx.category === budget.category;
                const isExpense = tx.type === 'expense';
                const isWithinPeriod = txDate >= budgetStart && txDate <= periodEnd;
                return matchesCategory && isExpense && isWithinPeriod;
            });

            const totalSpent = relevantTransactions.reduce((sum, tx) => sum + tx.amount, 0);
            if (totalSpent > budget.limit) {
                exceeded.push({
                    id: budget.id,
                    category: budget.category as BudgetCategory,
                    limit: budget.limit,
                    totalSpent,
                    startDate: timestampToString(budget.startDate),
                    period: budget.period,
                });
            }
        });

        return exceeded;
    }, [budgets, transactions]);

    const exceededBudgetsCount = exceededBudgets.length;

    const filteredExceededBudgets = useMemo(() => {
        return exceededBudgets.filter((budget) => {
            const matchesCategory = filterCategory ? budget.category === filterCategory : true;
            const min = parseFloat(minLimit) || 0;
            const max = parseFloat(maxLimit) || Infinity;
            const matchesLimit = budget.limit >= min && budget.limit <= max;
            const budgetStart = normalizeDateToUTCStart(new Date(budget.startDate));
            const matchesDate = filterDate ? budgetStart.toDateString() === filterDate.toDateString() : true;

            return matchesCategory && matchesLimit && matchesDate;
        });
    }, [exceededBudgets, filterCategory, minLimit, maxLimit, filterDate]);

    const clearFilters = () => {
        setFilterCategory(null);
        setMinLimit('');
        setMaxLimit('');
        setFilterDate(null);
        setShowCalendar(false);
        setShowCategoryPicker(false);
    };

    const handleCategorySelect = (selectedCategory: BudgetCategory) => {
        setFilterCategory(selectedCategory);
        setShowCategoryPicker(false);
    };

    if (loading || roleLoading || authLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.centered}>
                    <Text>Loading...</Text>
                </View>
            </SafeAreaView>
        );
    }

    interface MenuItemProps {
        icon: IconName;
        label: string;
        onPress: () => void;
        color?: string;
        showArrow?: boolean;
        badgeCount?: number;
    }

    const MenuItem = ({ icon, label, onPress, color = "#333", showArrow = true, badgeCount = 0 }: MenuItemProps) => (
        <TouchableOpacity style={styles.menuItem} onPress={onPress}>
            <Ionicons name={icon} size={22} color={color} style={styles.menuIcon} />
            <Text style={[styles.menuText, color !== "#333" && { color }]}>{label}</Text>
            <View style={styles.menuItemRight}>
                {badgeCount > 0 && (
                    <View style={styles.notificationBadge}>
                        <Text style={styles.notificationCount}>{badgeCount}</Text>
                    </View>
                )}
                {showArrow && <Ionicons name="chevron-forward" size={20} color="#ccc" />}
            </View>
        </TouchableOpacity>
    );

    interface SectionTitleProps {
        title: string;
    }

    const SectionTitle = ({ title }: SectionTitleProps) => (
        <Text style={styles.sectionTitle}>{title}</Text>
    );

    const helpContent = [
        {
            question: "How do I add a new budget?",
            answer: "Go to the Budgets screen, tap 'Add Budget', fill in the details such as limit, category, and period, then tap 'Add Budget' to save."
        },
        {
            question: "Can I edit an existing budget?",
            answer: "Yes, on the Budgets screen, tap the three dots on a budget card, select 'Edit', make your changes, and tap 'Save Changes'."
        },
        {
            question: "How do I delete a budget?",
            answer: "On the Budgets screen, tap the three dots on a budget card, select 'Delete', and confirm the deletion."
        },
        {
            question: "What happens if I exceed my budget limit?",
            answer: "You'll receive a notification in the Settings screen under 'Notifications', showing which budgets have been exceeded."
        },
    ];

    const privacyContent = [
        { left: "Intro", right: "We protect your privacy. Effective: May 16, 2025." },
        { left: "Data We Collect", right: "Name, email, finances, app usage." },
        { left: "Use of Data", right: "To provide services, improve experience, send alerts, ensure security." },
        { left: "Sharing", right: "Only with consent, legal reasons, or trusted providers." },
        { left: "Security", right: "We use encryption; no system is 100% secure." },
        { left: "Your Rights", right: "Access, edit, delete data; opt out; contact us." },
        { left: "Policy Changes", right: "Updates shown in app with new date." },
        { left: "Contact", right: "support@budgettrackerai.com, 123 Budget Lane, Finance City, 90210." },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Profile Management</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <Toast
                    message={toastMessage}
                    visible={toastVisible}
                    onHide={() => setToastVisible(false)}
                />

                <View style={styles.profileCard}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {profile?.name?.[0] || profile?.email?.[0] || "U"}
                        </Text>
                    </View>

                    {editMode ? (
                        <View style={styles.editContainer}>
                            <Text style={styles.inputLabel}>Name</Text>
                            <Input
                                value={editName}
                                onChangeText={setEditName}
                                placeholder="Enter your name"
                                style={styles.input}
                                autoFocus
                            />
                            <View style={styles.buttonRow}>
                                <TouchableOpacity style={styles.button} onPress={() => setEditMode(false)}>
                                    <Text style={styles.buttonText}>Cancel</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.button, styles.primaryButton]}
                                    onPress={handleUpdateProfile}
                                >
                                    <Text style={styles.primaryButtonText}>Save</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <>
                            <Text style={styles.name}>{profile?.name || "User"}</Text>
                            <Text style={styles.email}>{profile?.email}</Text>
                            <View style={[styles.badge, role === 'ADMIN' ? styles.adminBadge : styles.userBadge]}>
                                <Text style={styles.badgeText}>{role || 'User'}</Text>
                            </View>
                        </>
                    )}
                </View>

                <View style={styles.section}>
                    <SectionTitle title="Account" />
                    <MenuItem icon="person-outline" label="Edit Profile" onPress={() => setEditMode(true)} />
                    {role === 'ADMIN' && (
                        <MenuItem
                            icon="shield-outline"
                            label="Admin Panel"
                            onPress={() => navigation.navigate('AdminPanel')}
                        />
                    )}
                </View>

                <View style={styles.section}>
                    <SectionTitle title="Preferences" />
                    <MenuItem
                        icon="notifications-outline"
                        label="Notifications"
                        onPress={() => exceededBudgetsCount > 0 && setNotificationModalVisible(true)}
                        badgeCount={exceededBudgetsCount}
                    />
                </View>

                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={notificationModalVisible}
                    onRequestClose={() => {
                        clearFilters();
                        setNotificationModalVisible(false);
                    }}
                >
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={{ flex: 1 }}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 30}
                    >
                        <View style={styles.modalContainer}>
                            <View style={[styles.modalContent, Platform.OS === 'ios' && styles.modalContentIOS]}>
                                <Text style={styles.modalTitle}>Budget Limit Alerts</Text>
                                {exceededBudgetsCount === 0 ? (
                                    <Text style={styles.noAlertsText}>No budget limits exceeded.</Text>
                                ) : (
                                    <>
                                        <Text style={styles.inputLabel}>Category</Text>
                                        <TouchableOpacity
                                            style={styles.categoryInput}
                                            onPress={() => setShowCategoryPicker(true)}
                                        >
                                            <Text style={styles.categoryInputText}>
                                                {filterCategory || 'Select category'}
                                            </Text>
                                            <MaterialIcons name="arrow-drop-down" size={24} color="#6B7280" />
                                        </TouchableOpacity>

                                        {showCategoryPicker && (
                                            <View style={styles.categoryPicker}>
                                                <FlatList
                                                    data={CATEGORIES}
                                                    keyExtractor={(item) => item}
                                                    renderItem={({ item }) => {
                                                        const categoryItem = item as BudgetCategory;
                                                        const categoryConfig = CATEGORY_CONFIG[categoryItem];
                                                        return (
                                                            <TouchableOpacity
                                                                style={[
                                                                    styles.categoryItem,
                                                                    filterCategory === categoryItem && styles.selectedCategoryItem,
                                                                ]}
                                                                onPress={() => handleCategorySelect(categoryItem)}
                                                            >
                                                                <MaterialIcons
                                                                    name={categoryConfig.icon}
                                                                    size={20}
                                                                    color={categoryConfig.color}
                                                                    style={styles.categoryIcon}
                                                                />
                                                                <Text
                                                                    style={[
                                                                        styles.categoryItemText,
                                                                        filterCategory === categoryItem && styles.selectedCategoryText,
                                                                    ]}
                                                                >
                                                                    {categoryItem}
                                                                </Text>
                                                                {filterCategory === categoryItem && (
                                                                    <MaterialIcons name="check" size={20} color="#007AFF" />
                                                                )}
                                                            </TouchableOpacity>
                                                        );
                                                    }}
                                                    style={styles.categoryList}
                                                />
                                                <Button
                                                    title="Close Categories"
                                                    variant="outline"
                                                    onPress={() => setShowCategoryPicker(false)}
                                                    style={styles.cancelCategoryButton}
                                                />
                                            </View>
                                        )}

                                        <Text style={styles.inputLabel}>Minimum Limit ($)</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={minLimit}
                                            onChangeText={setMinLimit}
                                            keyboardType="numeric"
                                            placeholder="Enter minimum limit"
                                        />

                                        <Text style={styles.inputLabel}>Maximum Limit ($)</Text>
                                        <TextInput
                                            style={styles.input}
                                            value={maxLimit}
                                            onChangeText={setMaxLimit}
                                            keyboardType="numeric"
                                            placeholder="Enter maximum limit"
                                        />

                                        <Text style={styles.inputLabel}>Date</Text>
                                        <View style={styles.dateInputContainer}>
                                            <Text style={styles.dateText}>
                                                {filterDate ? filterDate.toLocaleDateString() : 'Select date'}
                                            </Text>
                                            <TouchableOpacity
                                                style={styles.datePickerButton}
                                                onPress={() => setShowCalendar(true)}
                                            >
                                                <MaterialIcons
                                                    name="calendar-today"
                                                    size={20}
                                                    color="#007AFF"
                                                />
                                            </TouchableOpacity>
                                        </View>

                                        {showCalendar && (
                                            <CustomCalendar
                                                selectedDate={filterDate}
                                                onDateSelect={(date) => setFilterDate(date)}
                                                onClose={() => setShowCalendar(false)}
                                            />
                                        )}

                                        <Button
                                            title="Clear Filter"
                                            onPress={clearFilters}
                                            style={styles.clearFilterButton}
                                            variant="outline"
                                        />

                                        {filteredExceededBudgets.length === 0 ? (
                                            <Text style={styles.noAlertsText}>No budgets match the filter criteria.</Text>
                                        ) : (
                                            <FlatList
                                                data={filteredExceededBudgets}
                                                keyExtractor={(item) => item.id}
                                                renderItem={({ item }) => {
                                                    const categoryConfig = CATEGORY_CONFIG[item.category as keyof typeof CATEGORY_CONFIG] || {
                                                        icon: 'help',
                                                        color: '#6B7280',
                                                    };
                                                    return (
                                                        <View style={styles.budgetItem}>
                                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                                <MaterialIcons
                                                                    name={categoryConfig.icon}
                                                                    size={20}
                                                                    color={categoryConfig.color}
                                                                    style={{ marginRight: 8 }}
                                                                />
                                                                <Text style={styles.budgetText}>
                                                                    {item.category}: Limit ${item.limit.toFixed(2)} exceeded. Spent: ${item.totalSpent.toFixed(2)}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    );
                                                }}
                                                style={styles.budgetList}
                                            />
                                        )}
                                    </>
                                )}
                                {!showCalendar && !showCategoryPicker && (
                                    <Button
                                        title="Close"
                                        onPress={() => {
                                            clearFilters();
                                            setNotificationModalVisible(false);
                                        }}
                                        style={styles.closeButton}
                                    />
                                )}
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </Modal>

                <View style={styles.section}>
                    <SectionTitle title="Support" />
                    <MenuItem
                        icon="help-circle-outline"
                        label="Help & Support"
                        onPress={() => setHelpModalVisible(true)}
                    />
                    <MenuItem
                        icon="document-text-outline"
                        label="Privacy Policy"
                        onPress={() => setPrivacyModalVisible(true)}
                    />
                </View>

                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={helpModalVisible}
                    onRequestClose={() => setHelpModalVisible(false)}
                >
                    <View style={styles.modalContainer}>
                        <ScrollView contentContainerStyle={styles.modalScrollContent}>
                            <View style={[styles.modalContent, Platform.OS === 'ios' && styles.modalContentIOS]}>
                                <Text style={styles.modalTitle}>Help & Support</Text>
                                <View style={styles.twoColumnContainer}>
                                    <View style={styles.column}>
                                        {helpContent.slice(0, Math.ceil(helpContent.length / 2)).map((item, index) => (
                                            <View key={index} style={styles.helpItem}>
                                                <Text style={styles.helpQuestion}>{item.question}</Text>
                                                <Text style={styles.helpAnswer}>{item.answer}</Text>
                                            </View>
                                        ))}
                                    </View>
                                    <View style={styles.column}>
                                        {helpContent.slice(Math.ceil(helpContent.length / 2)).map((item, index) => (
                                            <View key={index} style={styles.helpItem}>
                                                <Text style={styles.helpQuestion}>{item.question}</Text>
                                                <Text style={styles.helpAnswer}>{item.answer}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                                <Button
                                    title="Close"
                                    onPress={() => setHelpModalVisible(false)}
                                    style={styles.closeButton}
                                />
                            </View>
                        </ScrollView>
                    </View>
                </Modal>

                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={privacyModalVisible}
                    onRequestClose={() => setPrivacyModalVisible(false)}
                >
                    <View style={styles.modalContainer}>
                        <ScrollView contentContainerStyle={styles.modalScrollContent}>
                            <View style={[styles.modalContent, Platform.OS === 'ios' && styles.modalContentIOS]}>
                                <Text style={styles.modalTitle}>Privacy Policy</Text>
                                <View style={styles.twoColumnContainer}>
                                    <View style={styles.column}>
                                        {privacyContent.slice(0, Math.ceil(privacyContent.length / 2)).map((item, index) => (
                                            <View key={index} style={styles.helpItem}>
                                                <Text style={styles.helpQuestion}>{item.left}</Text>
                                                <Text style={styles.helpAnswer}>{item.right}</Text>
                                            </View>
                                        ))}
                                    </View>
                                    <View style={styles.column}>
                                        {privacyContent.slice(Math.ceil(privacyContent.length / 2)).map((item, index) => (
                                            <View key={index} style={styles.helpItem}>
                                                <Text style={styles.helpQuestion}>{item.left}</Text>
                                                <Text style={styles.helpAnswer}>{item.right}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                                <Button
                                    title="Close"
                                    onPress={() => setPrivacyModalVisible(false)}
                                    style={styles.closeButton}
                                />
                            </View>
                        </ScrollView>
                    </View>
                </Modal>

                <MenuItem
                    icon="log-out-outline"
                    label="Log Out"
                    onPress={handleSignOut}
                    color="#FF3B30"
                />

                <Text style={styles.version}>Version 1.0.0</Text>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#f8f9fa",
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        paddingVertical: 16,
        paddingHorizontal: 20,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#eee",
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#111",
    },
    content: {
        paddingBottom: 30,
    },
    profileCard: {
        alignItems: "center",
        padding: 30,
        backgroundColor: "#fff",
        marginBottom: 20,
        marginHorizontal: 20,
        borderRadius: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
        marginTop: 20,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "#007AFF",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
    },
    avatarText: {
        color: "#fff",
        fontSize: 28,
        fontWeight: "600",
        textTransform: "uppercase",
    },
    name: {
        fontSize: 22,
        fontWeight: "700",
        color: "#111",
        marginBottom: 4,
    },
    email: {
        fontSize: 15,
        color: "#666",
        marginBottom: 12,
    },
    badge: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    adminBadge: {
        backgroundColor: "#10B981",
    },
    userBadge: {
        backgroundColor: "#007AFF",
    },
    badgeText: {
        color: "#fff",
        fontSize: 12,
        fontWeight: "700",
        textTransform: "uppercase",
    },
    section: {
        marginHorizontal: 20,
        marginBottom: 20,
        backgroundColor: "#fff",
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: "600",
        color: "#666",
        marginLeft: 16,
        marginTop: 16,
        marginBottom: 8,
    },
    menuItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: "#fff",
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    menuIcon: {
        width: 24,
        marginRight: 12,
        textAlign: "center",
    },
    menuText: {
        flex: 1,
        fontSize: 16,
        color: "#333",
    },
    menuItemRight: {
        flexDirection: "row",
        alignItems: "center",
    },
    notificationBadge: {
        backgroundColor: "#EF4444",
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 8,
    },
    notificationCount: {
        color: "#FFFFFF",
        fontSize: 12,
        fontWeight: "600",
    },
    editContainer: {
        width: "100%",
        alignItems: "center",
    },
    input: {
        width: "100%",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        borderRadius: 8,
        padding: 14,
        marginVertical: 10,
        fontSize: 16,
        backgroundColor: "#FFFFFF",
        color: "#000000",
    },
    inputLabel: {
        width: "100%",
        textAlign: "left",
        fontSize: 14,
        fontWeight: "600",
        color: "#666",
        marginBottom: 6,
    },
    buttonRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        width: "100%",
        marginTop: 10,
    },
    button: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        justifyContent: "center",
        alignItems: "center",
        marginHorizontal: 5,
        backgroundColor: "#F3F4F6",
    },
    primaryButton: {
        backgroundColor: "#007AFF",
    },
    buttonText: {
        fontWeight: "600",
        color: "#333",
    },
    primaryButtonText: {
        color: "#fff",
        fontWeight: "600",
    },
    version: {
        fontSize: 12,
        color: "#999",
        textAlign: "center",
        marginTop: 20,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalScrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 20,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        width: '80%',
        maxHeight: '90%',
        alignItems: 'center',
    },
    modalContentIOS: {
        paddingBottom: 40,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 16,
    },
    noAlertsText: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        marginVertical: 20,
    },
    categoryInput: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        padding: 12,
        backgroundColor: '#FFFFFF',
        marginBottom: 16,
        width: '100%',
    },
    categoryInputText: {
        flex: 1,
        fontSize: 16,
        color: '#1F2937',
        marginLeft: 8,
    },
    categoryPicker: {
        marginBottom: 16,
        maxHeight: 200,
        width: '100%',
    },
    categoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#F9FAFB',
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    selectedCategoryItem: {
        backgroundColor: '#F0F7FF',
        borderColor: '#DBEAFE',
    },
    categoryIcon: {
        marginRight: 8,
    },
    categoryItemText: {
        fontSize: 15,
        color: '#374151',
        flex: 1,
    },
    selectedCategoryText: {
        fontWeight: '500',
        color: '#1F2937',
    },
    categoryList: {
        marginBottom: 12,
    },
    cancelCategoryButton: {
        marginTop: 8,
    },
    dateInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        width: '100%',
        backgroundColor: '#F9FAFB',
    },
    dateText: {
        fontSize: 16,
        color: '#1F2937',
        flex: 1,
    },
    datePickerButton: {
        padding: 4,
    },
    calendarContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        padding: 12,
        width: '100%',
        borderWidth: 1,
        borderColor: '#E5E7EB',
        marginBottom: 16,
        maxHeight: 280,
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    calendarTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    daysHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    dayHeaderText: {
        fontSize: 12,
        color: '#6B7280',
        width: 32,
        textAlign: "center",
    },
    daysScrollContainer: {
        maxHeight: 180,
    },
    daysContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    day: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
        borderRadius: 16,
    },
    dayEmpty: {
        width: 32,
        height: 32,
        marginBottom: 6,
    },
    dayText: {
        fontSize: 12,
        color: '#111827',
    },
    daySelected: {
        backgroundColor: '#007AFF',
    },
    dayTextSelected: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    calendarCloseButton: {
        marginTop: 8,
        width: '100%',
    },
    clearFilterButton: {
        marginVertical: 16,
        width: '100%',
    },
    budgetList: {
        maxHeight: 150,
        marginVertical: 16,
        width: '100%',
    },
    budgetItem: {
        padding: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    budgetText: {
        fontSize: 14,
        color: '#111827',
    },
    closeButton: {
        marginTop: 16,
        width: '100%',
    },
    twoColumnContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 16,
    },
    column: {
        flex: 1,
        marginHorizontal: 8,
    },
    helpItem: {
        marginBottom: 16,
    },
    helpQuestion: {
        fontSize: 14,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
    },
    helpAnswer: {
        fontSize: 14,
        color: '#6B7280',
        lineHeight: 20,
    },
    toastContainer: {
        position: 'absolute',
        top: 20,
        left: 40,
        right: 20,
        backgroundColor: '#10B981',
        padding: 16,
        borderRadius: 8,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        zIndex: 1000,
        width: '80%',
    },
    toastText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default SettingsScreen;