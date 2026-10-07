//BudgetTrackerAi/src/screens/budgets/BudgetsScreen.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    FlatList,
    Text,
    Alert,
    Modal,
    TouchableOpacity,
    StyleSheet,
    useWindowDimensions,
    Platform,
    Pressable,
    Image,
    TextInput,
    KeyboardAvoidingView,
} from 'react-native';
import { useBudgets } from '@hooks/useBudgets';
import { useAuth } from '@hooks/useAuth';
import { useTransactions } from '@hooks/useTransactions';
import Button from '@components/Button';
import Input from '@components/Input';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { CATEGORIES, CATEGORY_CONFIG } from '@/constants/categories';
import * as Haptics from 'expo-haptics';
import { BudgetCategory, timestampToString } from '@/types/finance';
import { formatCurrency } from '@utils/formatCurrency';

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

const BudgetsScreen: React.FC = () => {
    const { width } = useWindowDimensions();
    const isSmallScreen = width < 380;
    const isTablet = width >= 768;

    const { user } = useAuth();
    const userId = user?.uid || '';
    const { budgets, loading, addBudget, updateBudget, deleteBudget } = useBudgets(userId);
    const { transactions } = useTransactions(userId);
    const [limit, setLimit] = useState('');
    const [category, setCategory] = useState<BudgetCategory>('Food & Dining');
    const [period, setPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('monthly');
    const [modalVisible, setModalVisible] = useState(false);
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [error, setError] = useState('');
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [selectedBudget, setSelectedBudget] = useState<{
        id: string;
        limit: number;
        category: BudgetCategory;
        period: 'weekly' | 'monthly' | 'yearly';
        startDate: string;
    } | null>(null);
    const [dropdownVisible, setDropdownVisible] = useState<string | null>(null);
    const [statusFilterModalVisible, setStatusFilterModalVisible] = useState(false);
    const [filterMinAmount, setFilterMinAmount] = useState('');
    const [filterMaxAmount, setFilterMaxAmount] = useState('');
    const [filterCategory, setFilterCategory] = useState<string | null>(null);
    const [showStatusCategoryPicker, setShowStatusCategoryPicker] = useState(false);

    const handleAdd = async () => {
        if (!userId) {
            Alert.alert('Error', 'Please sign in to add a budget');
            return;
        }
        try {
            const limitNum = Number(limit);
            if (isNaN(limitNum) || limitNum <= 0) {
                setError('Please enter a valid positive limit');
                if (Platform.OS !== 'web') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                return;
            }
            await addBudget({
                userId,
                limit: limitNum,
                category,
                period,
                startDate: new Date().toISOString(),
            });
            if (Platform.OS !== 'web') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setModalVisible(false);
            setLimit('');
            setCategory('Food & Dining');
            setPeriod('monthly');
            setError('');
        } catch (error: any) {
            setError(error.message || 'Failed to add budget');
            if (Platform.OS !== 'web') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
    };

    const handleEdit = async () => {
        if (!selectedBudget || !userId) return;
        try {
            const limitNum = Number(limit);
            if (isNaN(limitNum) || limitNum <= 0) {
                setError('Please enter a valid positive limit');
                if (Platform.OS !== 'web') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                return;
            }
            await updateBudget(selectedBudget.id, {
                id: selectedBudget.id,
                userId,
                limit: limitNum,
                category,
                period,
                startDate: selectedBudget.startDate,
            });
            if (Platform.OS !== 'web') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setEditModalVisible(false);
            setSelectedBudget(null);
            setLimit('');
            setCategory('Food & Dining');
            setPeriod('monthly');
            setError('');
        } catch (error: any) {
            setError(error.message || 'Failed to update budget');
            if (Platform.OS !== 'web') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
    };

    const showDeleteConfirmation = (id: string) => {
        if (Platform.OS === 'web') {
            const confirmed = window.confirm('Delete Budget\nAre you sure you want to delete this budget?');
            if (confirmed) {
                handleDelete(id);
            } else {
                setDropdownVisible(null);
            }
        } else {
            Alert.alert(
                'Delete Budget',
                'Are you sure you want to delete this budget?',
                [
                    { text: 'Cancel', style: 'cancel', onPress: () => setDropdownVisible(null) },
                    { text: 'Delete', style: 'destructive', onPress: () => handleDelete(id) },
                ],
                { onDismiss: () => setDropdownVisible(null) }
            );
        }
    };

    const handleDelete = async (id: string) => {
        if (!userId) {
            if (Platform.OS === 'web') {
                window.alert('Error\nPlease sign in to delete a budget');
            } else {
                Alert.alert('Error', 'Please sign in to delete a budget');
            }
            setDropdownVisible(null);
            return;
        }
        try {
            await deleteBudget(id);
            if (Platform.OS !== 'web') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error: any) {
            if (Platform.OS === 'web') {
                window.alert('Error\n' + (error.message || 'Failed to delete budget'));
            } else {
                Alert.alert('Error', error.message || 'Failed to delete budget');
            }
            if (Platform.OS !== 'web') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setDropdownVisible(null);
        }
    };

    const handleCategorySelect = (selectedCategory: BudgetCategory) => {
        setCategory(selectedCategory);
        setShowCategoryPicker(false);
        setError('');
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleStatusCategorySelect = (selectedCategory: string) => {
        setFilterCategory(selectedCategory);
        setShowStatusCategoryPicker(false);
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handlePeriodChange = (newPeriod: 'weekly' | 'monthly' | 'yearly') => {
        setPeriod(newPeriod);
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const renderCategoryIcon = (categoryName: BudgetCategory, size = 24) => {
        const config = CATEGORY_CONFIG[categoryName] || CATEGORY_CONFIG['Miscellaneous'];
        return (
            <MaterialIcons
                name={config.icon}
                size={size}
                color={config.color}
                style={styles.categoryIcon}
            />
        );
    };

    const getPeriodColor = (budgetPeriod: 'weekly' | 'monthly' | 'yearly') => {
        switch (budgetPeriod) {
            case 'weekly':
                return '#8B5CF6';
            case 'monthly':
                return '#3B82F6';
            case 'yearly':
                return '#059669';
            default:
                return '#6B7280';
        }
    };

    const getBudgetProgress = useMemo(() => {
        const progressMap: { [key: string]: { spent: number; progress: number } } = {};

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
                return (
                    tx.category === budget.category &&
                    tx.type === 'expense' &&
                    txDate >= budgetStart &&
                    txDate <= periodEnd
                );
            });

            const totalSpent = relevantTransactions.reduce((sum, tx) => sum + tx.amount, 0);
            const progress = budget.limit > 0 ? Math.min((totalSpent / budget.limit) * 100, 100) : 0;

            progressMap[budget.id] = { spent: totalSpent, progress: Math.floor(progress) };
        });

        return (budget: any) => progressMap[budget.id] || { spent: 0, progress: 0 };
    }, [budgets, transactions]);

    const { totalSpent, totalBudget, overBudgetCategories, filteredOverBudgetCategories } = useMemo(() => {
        const totalSpent = budgets.reduce((sum, budget) => {
            const { spent } = getBudgetProgress(budget);
            return sum + spent;
        }, 0);

        const totalBudget = budgets.reduce((sum, budget) => sum + budget.limit, 0);

        const overBudgetCategories = budgets
            .map((budget) => {
                const { spent } = getBudgetProgress(budget);
                return { ...budget, spent };
            })
            .filter((budget) => budget.spent > budget.limit);

        const min = parseFloat(filterMinAmount) || 0;
        const max = parseFloat(filterMaxAmount) || Infinity;
        const filteredOverBudgetCategories = overBudgetCategories.filter((budget) => {
            const matchesAmount = budget.spent >= min && budget.spent <= max;
            const matchesCategory = filterCategory ? budget.category === filterCategory : true;
            return matchesAmount && matchesCategory;
        });

        return { totalSpent, totalBudget, overBudgetCategories, filteredOverBudgetCategories };
    }, [budgets, getBudgetProgress, filterMinAmount, filterMaxAmount, filterCategory]);

    const clearStatusFilters = () => {
        setFilterMinAmount('');
        setFilterMaxAmount('');
        setFilterCategory(null);
        setShowStatusCategoryPicker(false);
    };

    const BudgetItem = React.memo(
        ({
             item,
             isTablet,
             onEdit,
             onDelete,
             onCancel,
             isDropdownVisible,
         }: {
            item: any;
            isTablet: boolean;
            onEdit: () => void;
            onDelete: () => void;
            onCancel: () => void;
            isDropdownVisible: boolean;
        }) => {
            const { progress } = getBudgetProgress(item);
            const periodColor = getPeriodColor(item.period);

            return (
                <View style={[styles.budgetCard, isTablet && styles.budgetCardTablet]}>
                    <View style={styles.budgetHeader}>
                        <View style={styles.budgetLeft}>
                            {renderCategoryIcon(item.category as BudgetCategory)}
                            <View>
                                <Text style={styles.budgetCategory}>{item.category}</Text>
                                <View style={styles.periodBadge}>
                                    <Text style={[styles.periodText, { color: periodColor }]}>
                                        {item.period.charAt(0).toUpperCase() + item.period.slice(1)}
                                    </Text>
                                </View>
                            </View>
                        </View>
                        <View style={styles.budgetRight}>
                            <Text style={styles.budgetLimit}>{formatCurrency(item.limit)}</Text>
                            <TouchableOpacity
                                style={styles.editButton}
                                onPress={() => (isDropdownVisible ? onCancel() : setDropdownVisible(item.id))}
                            >
                                <MaterialIcons name="more-vert" size={24} color="#007AFF" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.progressContainer}>
                        <View style={styles.progressBackground}>
                            <View
                                style={[
                                    styles.progressFill,
                                    {
                                        width: `${progress}%`,
                                        backgroundColor:
                                            progress > 90 ? '#EF4444' : progress > 75 ? '#F59E0B' : '#10B981',
                                    },
                                ]}
                            />
                        </View>
                        <Text style={styles.progressText}>{progress}% used</Text>
                    </View>

                    {isDropdownVisible && (
                        <Modal transparent visible={true} onRequestClose={onCancel} animationType="fade">
                            <TouchableOpacity
                                style={styles.dropdownOverlay}
                                onPress={onCancel}
                                activeOpacity={0.6}
                            >
                                <View style={[styles.dropdown, isTablet && styles.dropdownTablet]}>
                                    <Pressable style={styles.dropdownItem} onPress={onEdit}>
                                        <MaterialIcons
                                            name="edit"
                                            size={20}
                                            color="#374151"
                                            style={styles.dropdownIcon}
                                        />
                                        <Text style={styles.dropdownItemText}>Edit</Text>
                                    </Pressable>
                                    <Pressable
                                        style={styles.dropdownItem}
                                        onPress={() => showDeleteConfirmation(item.id)}
                                    >
                                        <MaterialIcons
                                            name="delete"
                                            size={20}
                                            color="#EF4444"
                                            style={styles.dropdownIcon}
                                        />
                                        <Text style={[styles.dropdownItemText, { color: '#EF4444' }]}>Delete</Text>
                                    </Pressable>
                                    <Pressable style={styles.dropdownItem} onPress={onCancel}>
                                        <MaterialIcons
                                            name="close"
                                            size={20}
                                            color="#6B7280"
                                            style={styles.dropdownIcon}
                                        />
                                        <Text style={styles.dropdownItemText}>Cancel</Text>
                                    </Pressable>
                                </View>
                            </TouchableOpacity>
                        </Modal>
                    )}
                </View>
            );
        }
    );

    if (loading) {
        return (
            <LinearGradient colors={['#F9FAFB', '#E5E7EB']} style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading your budgets...</Text>
            </LinearGradient>
        );
    }

    if (!user) {
        return (
            <LinearGradient colors={['#F9FAFB', '#E5E7EB']} style={styles.container}>
                <View style={styles.emptyStateContainer}>
                    <MaterialIcons name="account-balance" size={64} color="#9CA3AF" />
                    <Text style={styles.emptyTitle}>Budgets Unavailable</Text>
                    <Text style={styles.emptyText}>Please sign in to view and manage your budgets.</Text>
                </View>
            </LinearGradient>
        );
    }

    const overallPercentSpent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    const overallProgressColor = totalSpent > totalBudget ? '#EF4444' : '#22C55E';

    const isFilterActive = filterMinAmount !== '' || filterMaxAmount !== '' || filterCategory !== null;

    return (
        <LinearGradient colors={['#F0F7FF', '#E5E7EB']} style={styles.container}>
            <View style={styles.headerContainer}>
                <Image
                    source={require('../../assets/icon.png')}
                    style={[styles.statusIcon, { borderRadius: 55 }]}
                    resizeMode="contain"
                />
                <Text style={[styles.title, isSmallScreen && styles.smallTitle]}>Budget Management</Text>
                <View style={styles.overallStatusContainer}>
                    <View style={styles.overallStatusContent}>
                        <View style={styles.overallHeader}>
                            <Text style={styles.overallTitle}>Overall Budget Status</Text>
                            <TouchableOpacity
                                style={styles.filterButton}
                                onPress={() => setStatusFilterModalVisible(true)}
                            >
                                <MaterialIcons name="filter-list" size={16} color="#007AFF" />
                                <Text style={styles.filterButtonText}>Filter</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.overallText}>
                            Spent: {formatCurrency(totalSpent)} / Budget: {formatCurrency(totalBudget)}
                        </Text>
                        <View style={styles.progressBarContainer}>
                            <View
                                style={[
                                    styles.progressBar,
                                    {
                                        width: `${Math.min(overallPercentSpent, 100)}%`,
                                        backgroundColor: overallProgressColor,
                                    },
                                ]}
                            />
                        </View>
                    </View>
                </View>
            </View>

            {/* Overall Budget Status Filter Modal */}
            <Modal
                animationType="fade"
                transparent={true}
                visible={statusFilterModalVisible}
                onRequestClose={() => {
                    clearStatusFilters();
                    setStatusFilterModalVisible(false);
                    setShowStatusCategoryPicker(false);
                }}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 30}
                >
                    <View style={styles.modalContainer}>
                        <View style={[styles.modalContent, isTablet && styles.modalContentTablet]}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Filter Over Budget</Text>
                                <TouchableOpacity
                                    onPress={() => {
                                        clearStatusFilters();
                                        setStatusFilterModalVisible(false);
                                        setShowStatusCategoryPicker(false);
                                    }}
                                >
                                    <MaterialIcons name="close" size={24} color="#6B7280" />
                                </TouchableOpacity>
                            </View>
                            <View style={styles.filterInputContainer}>
                                <Text style={styles.inputLabel}>Min Amount ($)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={filterMinAmount}
                                    onChangeText={setFilterMinAmount}
                                    keyboardType="numeric"
                                    placeholder="0.00"
                                />
                            </View>
                            <View style={styles.filterInputContainer}>
                                <Text style={styles.inputLabel}>Max Amount ($)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={filterMaxAmount}
                                    onChangeText={setFilterMaxAmount}
                                    keyboardType="numeric"
                                    placeholder="∞"
                                />
                            </View>
                            <View style={styles.filterInputContainer}>
                                <Text style={styles.inputLabel}>Category</Text>
                                <TouchableOpacity
                                    style={styles.categoryInput}
                                    onPress={() => setShowStatusCategoryPicker(true)}
                                >
                                    <Text style={styles.categoryInputText}>
                                        {filterCategory || 'Select category'}
                                    </Text>
                                    <MaterialIcons name="arrow-drop-down" size={24} color="#6B7280" />
                                </TouchableOpacity>
                                {showStatusCategoryPicker && (
                                    <View style={styles.categoryPicker}>
                                        <FlatList
                                            data={overBudgetCategories}
                                            keyExtractor={(item) => item.id}
                                            renderItem={({ item }) => (
                                                <TouchableOpacity
                                                    style={styles.categoryItem}
                                                    onPress={() => handleStatusCategorySelect(item.category)}
                                                >
                                                    <MaterialIcons
                                                        name={
                                                            CATEGORY_CONFIG[item.category as BudgetCategory]?.icon ||
                                                            'help'
                                                        }
                                                        size={20}
                                                        color={
                                                            CATEGORY_CONFIG[item.category as BudgetCategory]?.color ||
                                                            '#6B7280'
                                                        }
                                                        style={styles.categoryItemIcon}
                                                    />
                                                    <Text style={styles.categoryItemText}>{item.category}</Text>
                                                </TouchableOpacity>
                                            )}
                                            style={styles.categoryList}
                                        />
                                        <TouchableOpacity
                                            onPress={() => setShowStatusCategoryPicker(false)}
                                            style={styles.cancelCategoryButton}
                                        >
                                            <Text style={styles.cancelCategoryText}>Close</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                            <TouchableOpacity onPress={clearStatusFilters} style={styles.clearFilterButton}>
                                <Text style={styles.clearFilterText}>Clear Filters</Text>
                            </TouchableOpacity>
                            {isFilterActive ? (
                                filteredOverBudgetCategories.length > 0 ? (
                                    <FlatList
                                        data={filteredOverBudgetCategories}
                                        keyExtractor={(item, index) => `${item.id}-${index}`}
                                        renderItem={({ item }) => (
                                            <View style={styles.overBudgetItem}>
                                                <MaterialIcons
                                                    name={
                                                        CATEGORY_CONFIG[item.category as BudgetCategory]?.icon || 'help'
                                                    }
                                                    size={16}
                                                    color={
                                                        CATEGORY_CONFIG[item.category as BudgetCategory]?.color || '#6B7280'
                                                    }
                                                />
                                                <Text style={styles.overBudgetCategory}>
                                                    {item.category}: {formatCurrency(item.spent)} /{' '}
                                                    {formatCurrency(item.limit)}
                                                </Text>
                                            </View>
                                        )}
                                        style={styles.filteredOverBudgetList}
                                    />
                                ) : (
                                    <Text style={styles.noDataText}>No over-budget categories match the filters.</Text>
                                )
                            ) : (
                                <Text style={styles.noDataText}>Please set a filter to view over-budget categories.</Text>
                            )}
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {budgets.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                    <MaterialIcons name="account-balance-wallet" size={64} color="#9CA3AF" />
                    <Text style={styles.emptyTitle}>No Budgets Yet</Text>
                    <Text style={styles.emptyText}>
                        Set budget limits for different categories to track and manage your spending.
                    </Text>
                    <Button
                        title="Create Your First Budget"
                        onPress={() => {
                            setModalVisible(true);
                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        style={styles.emptyStateButton}
                        variant="primary"
                    />
                </View>
            ) : (
                <>
                    <FlatList
                        data={budgets}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <BudgetItem
                                item={item}
                                isTablet={isTablet}
                                onEdit={() => {
                                    setSelectedBudget({
                                        ...item,
                                        startDate: timestampToString(item.startDate),
                                    });
                                    setLimit(String(item.limit));
                                    setCategory(item.category as BudgetCategory);
                                    setPeriod(item.period);
                                    setEditModalVisible(true);
                                    setDropdownVisible(null);
                                }}
                                onDelete={() => showDeleteConfirmation(item.id)}
                                onCancel={() => setDropdownVisible(null)}
                                isDropdownVisible={dropdownVisible === item.id}
                            />
                        )}
                        style={styles.budgetList}
                        contentContainerStyle={styles.listContentContainer}
                        showsVerticalScrollIndicator={false}
                    />
                    <Button
                        title="Add Budget"
                        onPress={() => {
                            setModalVisible(true);
                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        style={styles.addButton}
                        variant="primary"
                    />
                </>
            )}

            {/* Add Budget Modal */}
            <Modal
                visible={modalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setModalVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1 }}
                    keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 30}
                >
                    <View style={styles.modalContainer}>
                        <View style={[styles.modalContent, isTablet && styles.modalContentTablet]}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Add Budget</Text>
                                <TouchableOpacity
                                    onPress={() => {
                                        setModalVisible(false);
                                        setShowCategoryPicker(false);
                                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    }}
                                    hitSlop={{ top: 20, right: 20, bottom: 20, left: 20 }}
                                >
                                    <MaterialIcons name="close" size={24} color="#6B7280" />
                                </TouchableOpacity>
                            </View>

                            <View>
                                <Input
                                    label="Budget Limit ($)"
                                    value={limit}
                                    onChangeText={(text) => {
                                        setLimit(text);
                                        setError('');
                                    }}
                                    placeholder="Enter budget limit"
                                    keyboardType="numeric"
                                />

                                <Text style={styles.inputLabel}>Period</Text>
                                <View style={styles.periodSelector}>
                                    <TouchableOpacity
                                        style={[
                                            styles.periodButton,
                                            period === 'weekly' && styles.periodButtonActive,
                                            period === 'weekly' && { backgroundColor: '#8B5CF6' },
                                        ]}
                                        onPress={() => handlePeriodChange('weekly')}
                                    >
                                        <MaterialIcons
                                            name="date-range"
                                            size={20}
                                            color={period === 'weekly' ? '#FFFFFF' : '#6B7280'}
                                            style={styles.periodIcon}
                                        />
                                        <Text
                                            style={[
                                                styles.periodButtonText,
                                                period === 'weekly' && styles.periodButtonTextActive,
                                            ]}
                                        >
                                            Weekly
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.periodButton,
                                            period === 'monthly' && styles.periodButtonActive,
                                            period === 'monthly' && { backgroundColor: '#3B82F6' },
                                        ]}
                                        onPress={() => handlePeriodChange('monthly')}
                                    >
                                        <MaterialIcons
                                            name="calendar-today"
                                            size={20}
                                            color={period === 'monthly' ? '#FFFFFF' : '#6B7280'}
                                            style={styles.periodIcon}
                                        />
                                        <Text
                                            style={[
                                                styles.periodButtonText,
                                                period === 'monthly' && styles.periodButtonTextActive,
                                            ]}
                                        >
                                            Monthly
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                        styles.periodButton,
                                        period === 'yearly' && styles.periodButtonActive,
                                        period === 'yearly' && { backgroundColor: '#059669' },
                                        ]}
                                        onPress={() => handlePeriodChange('yearly')}
                                        >
                                    <MaterialIcons
                                        name="event"
                                        size={20}
                                        color={period === 'yearly' ? '#FFFFFF' : '#6B7280'}
                                        style={styles.periodIcon}
                                    />
                                    <Text
                                        style={[
                                            styles.periodButtonText,
                                            period === 'yearly' && styles.periodButtonTextActive,
                                        ]}
                                    >
                                        Yearly
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            <Text style={styles.inputLabel}>Category</Text>
                            <TouchableOpacity
                                style={styles.categoryInput}
                                onPress={() => setShowCategoryPicker(true)}
                            >
                                {category && renderCategoryIcon(category, 20)}
                                <Text style={styles.categoryInputText}>{category || 'Select category'}</Text>
                                <MaterialIcons name="arrow-drop-down" size={24} color="#6B7280" />
                            </TouchableOpacity>

                            {showCategoryPicker && (
                                <View style={styles.categoryPicker}>
                                    <FlatList
                                        data={CATEGORIES}
                                        keyExtractor={(item) => item}
                                        renderItem={({ item }) => {
                                            const categoryItem = item as BudgetCategory;
                                            return (
                                                <TouchableOpacity
                                                    style={styles.categoryItem}
                                                    onPress={() => handleCategorySelect(categoryItem)}
                                                >
                                                    <MaterialIcons
                                                        name={
                                                            CATEGORY_CONFIG[categoryItem]?.icon || 'help'
                                                        }
                                                        size={20}
                                                        color={
                                                            CATEGORY_CONFIG[categoryItem]?.color || '#6B7280'
                                                        }
                                                        style={styles.categoryItemIcon}
                                                    />
                                                    <Text style={styles.categoryItemText}>{categoryItem}</Text>
                                                </TouchableOpacity>
                                            );
                                        }}
                                        style={styles.categoryList}
                                    />
                                    <TouchableOpacity
                                        onPress={() => setShowCategoryPicker(false)}
                                        style={styles.cancelCategoryButton}
                                    >
                                        <Text style={styles.cancelCategoryText}>Close</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {error ? <Text style={styles.errorText}>{error}</Text> : null}

                            <Button
                                title="Add Budget"
                                onPress={handleAdd}
                                style={styles.modalButton}
                            />
                        </View>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>

    {/* Edit Budget Modal */}
    <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
    >
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 30}
        >
            <View style={styles.modalContainer}>
                <View style={[styles.modalContent, isTablet && styles.modalContentTablet]}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Edit Budget</Text>
                        <TouchableOpacity
                            onPress={() => {
                                setEditModalVisible(false);
                                setSelectedBudget(null);
                                setShowCategoryPicker(false);
                                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }}
                            hitSlop={{ top: 20, right: 20, bottom: 20, left: 20 }}
                        >
                            <MaterialIcons name="close" size={24} color="#6B7280" />
                        </TouchableOpacity>
                    </View>

                    <View>
                        <Input
                            label="Budget Limit ($)"
                            value={limit}
                            onChangeText={(text) => {
                                setLimit(text);
                                setError('');
                            }}
                            placeholder="Enter budget limit"
                            keyboardType="numeric"
                        />

                        <Text style={styles.inputLabel}>Period</Text>
                        <View style={styles.periodSelector}>
                            <TouchableOpacity
                                style={[
                                    styles.periodButton,
                                    period === 'weekly' && styles.periodButtonActive,
                                    period === 'weekly' && { backgroundColor: '#8B5CF6' },
                                ]}
                                onPress={() => handlePeriodChange('weekly')}
                            >
                                <MaterialIcons
                                    name="date-range"
                                    size={20}
                                    color={period === 'weekly' ? '#FFFFFF' : '#6B7280'}
                                    style={styles.periodIcon}
                                />
                                <Text
                                    style={[
                                        styles.periodButtonText,
                                        period === 'weekly' && styles.periodButtonTextActive,
                                    ]}
                                >
                                    Weekly
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.periodButton,
                                    period === 'monthly' && styles.periodButtonActive,
                                    period === 'monthly' && { backgroundColor: '#3B82F6' },
                                ]}
                                onPress={() => handlePeriodChange('monthly')}
                            >
                                <MaterialIcons
                                    name="calendar-today"
                                    size={20}
                                    color={period === 'monthly' ? '#FFFFFF' : '#6B7280'}
                                    style={styles.periodIcon}
                                />
                                <Text
                                    style={[
                                    styles.periodButtonText,
                                    period === 'monthly' && styles.periodButtonTextActive,
                                    ]}
                                    >
                                    Monthly
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[
                                styles.periodButton,
                                period === 'yearly' && styles.periodButtonActive,
                                period === 'yearly' && { backgroundColor: '#059669' },
                            ]}
                            onPress={() => handlePeriodChange('yearly')}
                        >
                            <MaterialIcons
                                name="event"
                                size={20}
                                color={period === 'yearly' ? '#FFFFFF' : '#6B7280'}
                                style={styles.periodIcon}
                            />
                            <Text
                                style={[
                                    styles.periodButtonText,
                                    period === 'yearly' && styles.periodButtonTextActive,
                                ]}
                            >
                                Yearly
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.inputLabel}>Category</Text>
                    <TouchableOpacity
                        style={styles.categoryInput}
                        onPress={() => setShowCategoryPicker(true)}
                    >
                        {category && renderCategoryIcon(category, 20)}
                        <Text style={styles.categoryInputText}>{category || 'Select category'}</Text>
                        <MaterialIcons name="arrow-drop-down" size={24} color="#6B7280" />
                    </TouchableOpacity>

                    {showCategoryPicker && (
                        <View style={styles.categoryPicker}>
                            <FlatList
                                data={CATEGORIES}
                                keyExtractor={(item) => item}
                                renderItem={({ item }) => {
                                    const categoryItem = item as BudgetCategory;
                                    return (
                                        <TouchableOpacity
                                            style={styles.categoryItem}
                                            onPress={() => handleCategorySelect(categoryItem)}
                                        >
                                            <MaterialIcons
                                                name={
                                                    CATEGORY_CONFIG[categoryItem]?.icon || 'help'
                                                }
                                                size={20}
                                                color={
                                                    CATEGORY_CONFIG[categoryItem]?.color || '#6B7280'
                                                }
                                                style={styles.categoryItemIcon}
                                            />
                                            <Text style={styles.categoryItemText}>{categoryItem}</Text>
                                        </TouchableOpacity>
                                    );
                                }}
                                style={styles.categoryList}
                            />
                            <TouchableOpacity
                                onPress={() => setShowCategoryPicker(false)}
                                style={styles.cancelCategoryButton}
                            >
                                <Text style={styles.cancelCategoryText}>Close</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    <Button
                        title="Save Changes"
                        onPress={handleEdit}
                        style={styles.modalButton}
                    />
                </View>
            </View>
        </View>
    </KeyboardAvoidingView>
</Modal>
</LinearGradient>
);
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        paddingTop: Platform.OS === 'ios' ? 3 : 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        fontSize: 18,
        color: '#1F2937',
        textAlign: 'center',
    },
    headerContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        flexWrap: 'wrap',
    },
    title: {
        fontSize: 28,
        fontWeight: '600',
        color: '#1F2937',
        textAlign: 'center',
    },
    smallTitle: {
        fontSize: 24,
    },
    overallStatusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        maxWidth: 300,
    },
    statusIcon: {
        width: 80,
        height: 80,
        marginRight: 12,
        marginBottom: 12,
    },
    overallStatusContent: {
        flex: 1,
    },
    overallHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    overallTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    filterButtonText: {
        fontSize: 12,
        color: '#007AFF',
        fontWeight: '600',
        marginLeft: 4,
    },
    overallText: {
        fontSize: 12,
        color: '#4B5563',
        marginVertical: 4,
    },
    progressBarContainer: {
        height: 6,
        backgroundColor: '#E5E7EB',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        borderRadius: 3,
    },
    overBudgetItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 8,
        paddingHorizontal: 4,
    },
    overBudgetCategory: {
        fontSize: 13,
        color: '#4B5563',
        marginLeft: 4,
        flexShrink: 1,
    },
    filteredOverBudgetList: {
        maxHeight: 200,
        marginBottom: 16,
    },
    noDataText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginVertical: 12,
    },
    addButton: {
        marginTop: -70,
        borderRadius: 36,
        marginHorizontal: 10,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4,
    },
    budgetList: {
        flex: 1,
    },
    listContentContainer: {
        paddingBottom: 50,
    },
    budgetCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 33,
        padding: 10,
        marginBottom: 12,
        marginHorizontal: 4,
        shadowColor: '#007AFF',
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 3 },
        elevation: 2,
    },
    budgetCardTablet: {
        marginHorizontal: 40,
        marginBottom: 16,
        padding: 20,
    },
    budgetHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    budgetLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    budgetRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    categoryIcon: {
        marginRight: 16,
    },
    budgetCategory: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1F2937',
    },
    periodBadge: {
        marginTop: 4,
    },
    periodText: {
        fontSize: 14,
        fontWeight: '500',
    },
    budgetLimit: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1F2937',
        marginRight: 12,
    },
    progressContainer: {
        marginTop: 4,
    },
    progressBackground: {
        height: 8,
        backgroundColor: '#E5E7EB',
        borderRadius: 4,
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#6B7280',
        marginTop: 6,
    },
    editButton: {
        padding: 4,
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1F2937',
        marginTop: 16,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptyText: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        marginBottom: 24,
        maxWidth: 300,
    },
    emptyStateButton: {
        minWidth: 200,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingTop: 16,
        maxHeight: '90%',
    },
    modalContentTablet: {
        marginHorizontal: 80,
        borderRadius: 24,
        marginBottom: 40,
        maxHeight: '80%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1F2937',
    },
    modalButton: {
        marginTop: 133,
        width: '50%',
        left:'25%',
    },
    inputLabel: {
        fontSize: 16,
        fontWeight: '500',
        color: '#374151',
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#FFFFFF',
    },
    filterInputContainer: {
        marginBottom: 16,
    },
    errorText: {
        color: '#EF4444',
        marginTop: 12,
        fontSize: 14,
    },
    periodSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    periodButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 8,
        backgroundColor: '#F3F4F6',
        marginHorizontal: 4,
    },
    periodButtonActive: {
        backgroundColor: '#3B82F6',
    },
    periodButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#6B7280',
    },
    periodButtonTextActive: {
        color: '#FFFFFF',
    },
    periodIcon: {
        marginRight: 6,
    },
    categoryInput: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        padding: 12,
        backgroundColor: '#FFFFFF',
    },
    categoryInputText: {
        flex: 1,
        fontSize: 16,
        color: '#1F2937',
        marginLeft: 8,
    },
    categoryPicker: {
        marginTop: 12,
        maxHeight: 300,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        padding: 8,
    },
    categoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    categoryItemIcon: {
        marginRight: 8,
    },
    categoryItemText: {
        fontSize: 15,
        color: '#374151',
    },
    categoryList: {
        marginBottom: 12,
    },
    cancelCategoryButton: {
        padding: 12,
        alignItems: 'center',
        marginTop: 8,
        backgroundColor: '#007AFF',
        borderRadius: 8,
    },
    cancelCategoryText: {
        fontSize: 14,
        color: '#FFFFFF',
        fontWeight: '600',
    },
    clearFilterButton: {
        padding: 12,
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        marginTop: 8,
        marginBottom: 12,
    },
    clearFilterText: {
        fontSize: 14,
        color: '#007AFF',
        fontWeight: '600',
    },
    dropdownOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    dropdown: {
        position: 'absolute',
        right: 20,
        top: '30%',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        width: 160,
    },
    dropdownTablet: {
        width: 200,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    dropdownIcon: {
        marginRight: 12,
    },
    dropdownItemText: {
        fontSize: 16,
        color: '#374151',
    },
});

export default BudgetsScreen;