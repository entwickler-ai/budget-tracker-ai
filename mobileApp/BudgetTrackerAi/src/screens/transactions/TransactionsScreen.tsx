//BudgetTrackerAi/src/screens/transactions/TransactionsScreen.tsx
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
    ScrollView,
} from 'react-native';
import { useTransactions } from '@hooks/useTransactions';
import { useAuth } from '@hooks/useAuth';
import Button from '@components/Button';
import Input from '@components/Input';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { CATEGORIES, CATEGORY_CONFIG } from '@/constants/categories';
import * as Haptics from 'expo-haptics';
import { TransactionCategory } from '@/types/finance';
import { LineChart, XAxis, YAxis, Tooltip, ResponsiveContainer, Line } from 'recharts';
import { formatCurrency } from '@utils/formatCurrency';

const TransactionsScreen: React.FC = () => {
    const { width } = useWindowDimensions();
    const isSmallScreen = width < 380;
    const isTablet = width >= 768;

    const { user } = useAuth();
    const userId = user?.uid || '';
    const { transactions, loading, addTransaction, updateTransaction, deleteTransaction } = useTransactions(userId);
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState<TransactionCategory>('Food & Dining');
    const [type, setType] = useState<'income' | 'expense'>('expense');
    const [description, setDescription] = useState('');
    const [modalVisible, setModalVisible] = useState(false);
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [error, setError] = useState('');
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<{
        id: string;
        amount: number;
        category: TransactionCategory;
        type: 'income' | 'expense';
        description?: string;
        date: string;
    } | null>(null);
    const [dropdownVisible, setDropdownVisible] = useState<string | null>(null);
    const [statusFilterModalVisible, setStatusFilterModalVisible] = useState(false);
    const [filterMinAmount, setFilterMinAmount] = useState('');
    const [filterMaxAmount, setFilterMaxAmount] = useState('');
    const [filterCategory, setFilterCategory] = useState<string | null>(null);
    const [showStatusCategoryPicker, setShowStatusCategoryPicker] = useState(false);

    const chartData = useMemo(() => {
        if (!transactions.length) return [];

        const expensesByDate = new Map();
        const expenseTransactions = transactions.filter((transaction) => transaction.type === 'expense');
        expenseTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        expenseTransactions.forEach((transaction) => {
            const date = new Date(transaction.date);
            const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            expensesByDate.set(dateStr, (expensesByDate.get(dateStr) || 0) + transaction.amount);
        });

        return Array.from(expensesByDate.entries()).map(([date, amount]) => ({
            date,
            amount: Number(amount.toFixed(2)),
        }));
    }, [transactions]);

    const { totalIncome, totalExpenses, netBalance, filteredTransactions } = useMemo(() => {
        const totalIncome = transactions
            .filter((tx) => tx.type === 'income')
            .reduce((sum, tx) => sum + tx.amount, 0);
        const totalExpenses = transactions
            .filter((tx) => tx.type === 'expense')
            .reduce((sum, tx) => sum + tx.amount, 0);
        const netBalance = totalIncome - totalExpenses;

        const min = parseFloat(filterMinAmount) || 0;
        const max = parseFloat(filterMaxAmount) || Infinity;
        const filteredTransactions = transactions.filter((tx) => {
            const matchesAmount = tx.amount >= min && tx.amount <= max;
            const matchesCategory = filterCategory ? tx.category === filterCategory : true;
            return matchesAmount && matchesCategory;
        });

        return { totalIncome, totalExpenses, netBalance, filteredTransactions };
    }, [transactions, filterMinAmount, filterMaxAmount, filterCategory]);

    const handleAdd = async () => {
        if (!userId) {
            Alert.alert('Error', 'Please sign in to add a transaction');
            return;
        }
        try {
            const amountNum = Number(amount);
            if (isNaN(amountNum) || amountNum <= 0) {
                setError('Please enter a valid positive amount');
                if (Platform.OS !== 'web') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                return;
            }
            if (!description.trim()) {
                setError('Please enter a description');
                if (Platform.OS !== 'web') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                return;
            }
            if (!category) {
                setError('Please select a category');
                if (Platform.OS !== 'web') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                return;
            }
            await addTransaction({
                userId,
                amount: amountNum,
                category,
                type,
                description: description.trim(),
                date: new Date().toISOString(),
            });
            if (Platform.OS !== 'web') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setModalVisible(false);
            setAmount('');
            setDescription('');
            setCategory('Food & Dining');
            setError('');
        } catch (error: any) {
            setError(error.message || 'Failed to add transaction');
            if (Platform.OS !== 'web') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
    };

    const handleEdit = async () => {
        if (!selectedTransaction || !userId) return;
        try {
            const amountNum = Number(amount);
            if (isNaN(amountNum) || amountNum <= 0) {
                setError('Please enter a valid positive amount');
                if (Platform.OS !== 'web') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                return;
            }
            if (!description.trim()) {
                setError('Please enter a description');
                if (Platform.OS !== 'web') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                return;
            }
            if (!category) {
                setError('Please select a category');
                if (Platform.OS !== 'web') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                return;
            }
            await updateTransaction(selectedTransaction.id, {
                id: selectedTransaction.id,
                userId,
                amount: amountNum,
                category,
                type,
                description: description.trim(),
                date: selectedTransaction.date,
            });
            if (Platform.OS !== 'web') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setEditModalVisible(false);
            setSelectedTransaction(null);
            setAmount('');
            setDescription('');
            setCategory('Food & Dining');
            setError('');
        } catch (error: any) {
            setError(error.message || 'Failed to update transaction');
            if (Platform.OS !== 'web') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
    };

    const showDeleteConfirmation = (id: string) => {
        if (Platform.OS === 'web') {
            const confirmed = window.confirm('Delete Transaction\nAre you sure you want to delete this transaction?');
            if (confirmed) {
                handleDelete(id);
            } else {
                setDropdownVisible(null);
            }
        } else {
            Alert.alert(
                'Delete Transaction',
                'Are you sure you want to delete this transaction?',
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
                window.alert('Error\nPlease sign in to delete a transaction');
            } else {
                Alert.alert('Error', 'Please sign in to delete a transaction');
            }
            setDropdownVisible(null);
            return;
        }
        try {
            await deleteTransaction(id);
            if (Platform.OS !== 'web') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error: any) {
            if (Platform.OS === 'web') {
                window.alert('Error\n' + (error.message || 'Failed to delete transaction'));
            } else {
                Alert.alert('Error', error.message || 'Failed to delete transaction');
            }
            if (Platform.OS !== 'web') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        } finally {
            setDropdownVisible(null);
        }
    };

    const handleTypeChange = (newType: 'income' | 'expense') => {
        setType(newType);
        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const handleCategorySelect = (selectedCategory: TransactionCategory) => {
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

    const clearStatusFilters = () => {
        setFilterMinAmount('');
        setFilterMaxAmount('');
        setFilterCategory(null);
        setShowStatusCategoryPicker(false);
    };

    const renderCategoryIcon = (categoryName: TransactionCategory, size = 24) => {
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

    const renderExpenseChart = () => {
        if (!chartData.length) return null;

        return (
            <View style={styles.chartContainer}>
                <Text style={styles.chartTitle}>Expenses Over Time</Text>
                {Platform.OS === 'web' ? (
                    <div style={{ width: '100%', height: 200 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={chartData}
                                margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                            >
                                <XAxis
                                    dataKey="date"
                                    tick={{ fontSize: 12 }}
                                    padding={{ left: 10, right: 10 }}
                                />
                                <YAxis
                                    tick={{ fontSize: 12 }}
                                    width={40}
                                />
                                <Tooltip
                                    formatter={(value) => [formatCurrency(value as number), 'Expense']}
                                    labelFormatter={(label) => `Date: ${label}`}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="amount"
                                    stroke="#EF4444"
                                    strokeWidth={2}
                                    dot={{ r: 4, fill: '#EF4444' }}
                                    activeDot={{ r: 6, fill: '#EF4444' }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <View style={{ height: 200, paddingRight: 10 }}>
                        <View style={{ height: 180, flexDirection: 'row' }}>
                            {/* Y-Achse */}
                            <View style={{ width: 40, height: '100%', justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: 5 }}>
                                {chartData.length > 0 && [
                                    <Text key="max" style={{ fontSize: 10, color: '#6B7280' }}>
                                        {formatCurrency(Math.max(...chartData.map(item => item.amount)))}
                                    </Text>,
                                    <Text key="mid" style={{ fontSize: 10, color: '#6B7280' }}>
                                        {formatCurrency(Math.max(...chartData.map(item => item.amount)) / 2)}
                                    </Text>,
                                    <Text key="min" style={{ fontSize: 10, color: '#6B7280' }}>
                                        {formatCurrency(0)}
                                    </Text>
                                ]}
                            </View>

                            {/* Chart Area */}
                            <View style={{ flex: 1, height: '100%' }}>
                                <View style={{ flexDirection: 'row', height: '100%', alignItems: 'flex-end' }}>
                                    {chartData.map((item, index) => {
                                        const maxAmount = Math.max(...chartData.map(item => item.amount));
                                        const barHeight = maxAmount > 0 ? (item.amount / maxAmount) * 150 : 0;
                                        return (
                                            <View key={index} style={{ flex: 1, alignItems: 'center' }}>
                                                <View
                                                    style={{
                                                        width: 8,
                                                        height: barHeight,
                                                        backgroundColor: '#EF4444',
                                                        borderRadius: 4,
                                                        marginHorizontal: 4
                                                    }}
                                                />
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        </View>

                        {/* X-Achse */}
                        <View style={{ height: 20, flexDirection: 'row', paddingLeft: 40 }}>
                            {chartData.map((item, index) => (
                                <View key={index} style={{ flex: 1, alignItems: 'center' }}>
                                    <Text style={{ fontSize: 10, color: '#6B7280' }}>{item.date}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}
            </View>
        );
    };

    if (loading) {
        return (
            <LinearGradient colors={['#F9FAFB', '#E5E7EB']} style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading your transactions...</Text>
            </LinearGradient>
        );
    }

    if (!user) {
        return (
            <LinearGradient colors={['#F9FAFB', '#E5E7EB']} style={styles.container}>
                <View style={styles.emptyStateContainer}>
                    <MaterialIcons name="account-balance-wallet" size={64} color="#9CA3AF" />
                    <Text style={styles.emptyTitle}>Transactions Unavailable</Text>
                    <Text style={styles.emptyText}>Please sign in to view and manage your transactions.</Text>
                </View>
            </LinearGradient>
        );
    }

    const isFilterActive = filterMinAmount !== '' || filterMaxAmount !== '' || filterCategory !== null;

    return (
        <LinearGradient colors={['#F0F7FF', '#E5E7EB']} style={styles.container}>
            <View style={styles.headerContainer}>
                <Image
                    source={require('../../assets/icon.png')}
                    style={[styles.statusIcon, { borderRadius: 55 }]}
                    resizeMode="contain"
                />
                <Text style={[styles.title, isSmallScreen && styles.smallTitle]}>All Transactions</Text>
                <View style={styles.overallStatusContainer}>
                    <View style={styles.overallStatusContent}>
                        <View style={styles.overallHeader}>
                            <Text style={styles.overallTitle}>Overall Transactions Status</Text>
                            <TouchableOpacity
                                style={styles.filterButton}
                                onPress={() => setStatusFilterModalVisible(true)}
                            >
                                <MaterialIcons name="filter-list" size={16} color="#007AFF" />
                                <Text style={styles.filterButtonText}>Filter</Text>
                            </TouchableOpacity>
                        </View>
                        <Text style={styles.overallText}>
                            Income: {formatCurrency(totalIncome)} | Expenses: {formatCurrency(totalExpenses)}
                        </Text>
                        <Text
                            style={[
                                styles.overallText,
                                { color: netBalance >= 0 ? '#10B981' : '#EF4444' },
                            ]}
                        >
                            Net: {formatCurrency(Math.abs(netBalance))} {netBalance >= 0 ? '(Surplus)' : '(Deficit)'}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Expense Chart Section */}
            {transactions.length > 0 && renderExpenseChart()}

            {/* Transactions Filter Modal */}
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
                <View style={styles.modalContainer}>
                    <View style={[styles.modalContent, isTablet && styles.modalContentTablet]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Filter Transactions</Text>
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
                                        data={CATEGORIES}
                                        keyExtractor={(item) => item}
                                        renderItem={({ item }) => (
                                            <TouchableOpacity
                                                style={styles.categoryItem}
                                                onPress={() => handleStatusCategorySelect(item)}
                                            >
                                                <MaterialIcons
                                                    name={CATEGORY_CONFIG[item as TransactionCategory]?.icon || 'help'}
                                                    size={20}
                                                    color={
                                                        CATEGORY_CONFIG[item as TransactionCategory]?.color || '#6B7280'
                                                    }
                                                    style={styles.categoryItemIcon}
                                                />
                                                <Text style={styles.categoryItemText}>{item}</Text>
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
                            filteredTransactions.length > 0 ? (
                                <ScrollView style={styles.filteredTransactionsScroll}>
                                    {filteredTransactions.map((tx, index) => (
                                        <View key={index} style={styles.filteredTransactionItem}>
                                            <MaterialIcons
                                                name={CATEGORY_CONFIG[tx.category as TransactionCategory]?.icon || 'help'}
                                                size={16}
                                                color={CATEGORY_CONFIG[tx.category as TransactionCategory]?.color || '#6B7280'}
                                            />
                                            <Text style={styles.filteredTransactionText}>
                                                {tx.description || 'No description'} ({tx.category}):{' '}
                                                {formatCurrency(tx.amount)} ({tx.type})
                                            </Text>
                                        </View>
                                    ))}
                                </ScrollView>
                            ) : (
                                <Text style={styles.noDataText}>No transactions match the filters.</Text>
                            )
                        ) : (
                            <Text style={styles.noDataText}>Please set a filter to view transactions.</Text>
                        )}
                    </View>
                </View>
            </Modal>

            {transactions.length === 0 ? (
                <View style={styles.emptyStateContainer}>
                    <MaterialIcons name="receipt-long" size={64} color="#9CA3AF" />
                    <Text style={styles.emptyTitle}>No Transactions Yet</Text>
                    <Text style={styles.emptyText}>
                        Start tracking your expenses and income to get insights into your finances.
                    </Text>
                    <Button
                        title="Add Your First Transaction"
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
                        data={transactions}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <View style={[styles.transactionCard, isTablet && styles.transactionCardTablet]}>
                                <View style={styles.transactionLeft}>
                                    {renderCategoryIcon(item.category as TransactionCategory)}
                                    <View>
                                        <Text style={styles.transactionDescription}>
                                            {item.description || 'No description'}
                                        </Text>
                                        <Text style={styles.transactionCategory}>
                                            {item.category} • {new Date(item.date).toLocaleDateString()}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.transactionRight}>
                                    <Text
                                        style={[
                                            styles.transactionAmount,
                                            { color: item.type === 'income' ? '#10B981' : '#EF4444' },
                                        ]}
                                    >
                                        {item.type === 'income' ? '+' : '-'}
                                        {formatCurrency(item.amount)}
                                    </Text>
                                    <TouchableOpacity
                                        style={styles.editButton}
                                        onPress={() => setDropdownVisible(item.id)}
                                    >
                                        <MaterialIcons name="more-vert" size={24} color="#007AFF" />
                                    </TouchableOpacity>
                                </View>
                                {dropdownVisible === item.id && (
                                    <Modal
                                        transparent
                                        visible={true}
                                        onRequestClose={() => setDropdownVisible(null)}
                                        animationType="fade"
                                    >
                                        <TouchableOpacity
                                            style={styles.dropdownOverlay}
                                            onPress={() => setDropdownVisible(null)}
                                            activeOpacity={0.6}
                                        >
                                            <View style={[styles.dropdown, isTablet && styles.dropdownTablet]}>
                                                <TouchableOpacity
                                                    style={styles.dropdownItem}
                                                    onPress={() => {
                                                        setSelectedTransaction(item);
                                                        setAmount(String(item.amount));
                                                        setCategory(item.category as TransactionCategory);
                                                        setType(item.type);
                                                        setDescription(item.description || '');
                                                        setEditModalVisible(true);
                                                        setDropdownVisible(null);
                                                    }}
                                                >
                                                    <MaterialIcons
                                                        name="edit"
                                                        size={20}
                                                        color="#374151"
                                                        style={styles.dropdownIcon}
                                                    />
                                                    <Text style={styles.dropdownItemText}>Edit</Text>
                                                </TouchableOpacity>
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
                                                    <Text style={[styles.dropdownItemText, { color: '#EF4444' }]}>
                                                        Delete
                                                    </Text>
                                                </Pressable>
                                                <TouchableOpacity
                                                    style={styles.dropdownItem}
                                                    onPress={() => setDropdownVisible(null)}
                                                >
                                                    <MaterialIcons
                                                        name="close"
                                                        size={20}
                                                        color="#6B7280"
                                                        style={styles.dropdownIcon}
                                                    />
                                                    <Text style={styles.dropdownItemText}>Cancel</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </TouchableOpacity>
                                    </Modal>
                                )}
                            </View>
                        )}
                        style={styles.transactionList}
                        contentContainerStyle={styles.listContentContainer}
                        showsVerticalScrollIndicator={false}
                    />
                    <Button
                        title="Add Transaction"
                        onPress={() => {
                            setModalVisible(true);
                            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }}
                        style={styles.addButton}
                        variant="primary"
                    />
                </>
            )}

            {/* Add Transaction Modal */}
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
                                <Text style={styles.modalTitle}>Add Transaction</Text>
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
                                <View style={styles.typeSelector}>
                                    <TouchableOpacity
                                        style={[
                                            styles.typeButton,
                                            type === 'expense' && styles.typeButtonActive,
                                        ]}
                                        onPress={() => handleTypeChange('expense')}
                                    >
                                        <MaterialIcons
                                            name="arrow-upward"
                                            size={20}
                                            color={type === 'expense' ? '#FFFFFF' : '#6B7280'}
                                            style={styles.typeIcon}
                                        />
                                        <Text
                                            style={[
                                                styles.typeButtonText,
                                                type === 'expense' && styles.typeButtonTextActive,
                                            ]}
                                        >
                                            Expense
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.typeButton,
                                            type === 'income' && styles.typeButtonActive,
                                            type === 'income' && styles.incomeActive,
                                        ]}
                                        onPress={() => handleTypeChange('income')}
                                    >
                                        <MaterialIcons
                                            name="arrow-downward"
                                            size={20}
                                            color={type === 'income' ? '#FFFFFF' : '#6B7280'}
                                            style={styles.typeIcon}
                                        />
                                        <Text
                                            style={[
                                                styles.typeButtonText,
                                                type === 'income' && styles.typeButtonTextActive,
                                            ]}
                                        >
                                            Income
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                <Input
                                    label="Amount ($)"
                                    value={amount}
                                    onChangeText={(text) => {
                                        setAmount(text);
                                        setError('');
                                    }}
                                    placeholder="Enter amount"
                                    keyboardType="numeric"
                                />

                                <Input
                                    label="Description"
                                    value={description}
                                    onChangeText={(text) => {
                                        setDescription(text);
                                        setError('');
                                    }}
                                    placeholder="Enter description"
                                />

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
                                                const categoryItem = item as TransactionCategory;
                                                return (
                                                    <TouchableOpacity
                                                        style={styles.categoryItem}
                                                        onPress={() => handleCategorySelect(categoryItem)}
                                                    >
                                                        <MaterialIcons
                                                            name={CATEGORY_CONFIG[categoryItem]?.icon || 'help'}
                                                            size={20}
                                                            color={CATEGORY_CONFIG[categoryItem]?.color || '#6B7280'}
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
                                    title="Add Transaction"
                                    onPress={handleAdd}
                                    style={styles.modalButton}
                                />
                            </View>
                        </View>
                    </View>
                </KeyboardAvoidingView>
            </Modal>

            {/* Edit Transaction Modal */}
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
                                <Text style={styles.modalTitle}>Edit Transaction</Text>
                                <TouchableOpacity
                                    onPress={() => {
                                        setEditModalVisible(false);
                                        setSelectedTransaction(null);
                                        setShowCategoryPicker(false);
                                        if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    }}
                                    hitSlop={{ top: 20, right: 20, bottom: 20, left: 20 }}
                                >
                                    <MaterialIcons name="close" size={24} color="#6B7280" />
                                </TouchableOpacity>
                            </View>

                            <View>
                                <View style={styles.typeSelector}>
                                    <TouchableOpacity
                                        style={[
                                            styles.typeButton,
                                            type === 'expense' && styles.typeButtonActive,
                                        ]}
                                        onPress={() => handleTypeChange('expense')}
                                    >
                                        <MaterialIcons
                                            name="arrow-upward"
                                            size={20}
                                            color={type === 'expense' ? '#FFFFFF' : '#6B7280'}
                                            style={styles.typeIcon}
                                        />
                                        <Text
                                            style={[
                                                styles.typeButtonText,
                                                type === 'expense' && styles.typeButtonTextActive,
                                            ]}
                                        >
                                            Expense
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.typeButton,
                                            type === 'income' && styles.typeButtonActive,
                                            type === 'income' && styles.incomeActive,
                                        ]}
                                        onPress={() => handleTypeChange('income')}
                                    >
                                        <MaterialIcons
                                            name="arrow-downward"
                                            size={20}
                                            color={type === 'income' ? '#FFFFFF' : '#6B7280'}
                                            style={styles.typeIcon}
                                        />
                                        <Text
                                            style={[
                                                styles.typeButtonText,
                                                type === 'income' && styles.typeButtonTextActive,
                                            ]}
                                        >
                                            Income
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                <Input
                                    label="Amount ($)"
                                    value={amount}
                                    onChangeText={(text) => {
                                        setAmount(text);
                                        setError('');
                                    }}
                                    placeholder="Enter amount"
                                    keyboardType="numeric"
                                />

                                <Input
                                    label="Description"
                                    value={description}
                                    onChangeText={(text) => {
                                        setDescription(text);
                                        setError('');
                                    }}
                                    placeholder="Enter description"
                                />

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
                                                const categoryItem = item as TransactionCategory;
                                                return (
                                                    <TouchableOpacity
                                                        style={styles.categoryItem}
                                                        onPress={() => handleCategorySelect(categoryItem)}
                                                    >
                                                        <MaterialIcons
                                                            name={CATEGORY_CONFIG[categoryItem]?.icon || 'help'}
                                                            size={20}
                                                            color={CATEGORY_CONFIG[categoryItem]?.color || '#6B7280'}
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
    chartContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        padding: 10,
        marginBottom: 10,
        marginTop:-15,
        marginLeft:20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        width: '90%',
    },
    chartTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 10,
    },
    mobilePlaceholder: {
        height: 150,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
    },
    placeholderText: {
        color: '#6B7280',
        fontSize: 16,
    },
    overallStatusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 6,
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
        alignItems: 'center',
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
    transactionList: {
        flex: 1,
    },
    listContentContainer: {
        paddingBottom: 50,
    },
    transactionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 33,
        padding: 10,
        marginBottom: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 2,
        marginHorizontal: 4,
    },
    transactionCardTablet: {
        paddingHorizontal: 24,
        paddingVertical: 20,
    },
    transactionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    categoryIcon: {
        marginRight: 12,
    },
    transactionDescription: {
        fontSize: 16,
        fontWeight: '500',
        color: '#1F2937',
        marginBottom: 4,
    },
    transactionCategory: {
        fontSize: 14,
        color: '#6B7280',
    },
    transactionRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    transactionAmount: {
        fontSize: 16,
        fontWeight: '600',
        marginRight: 8,
    },
    editButton: {
        padding: 6,
    },
    emptyStateContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyTitle: {
        fontSize: 22,
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
        maxWidth: 360,
    },
    emptyStateButton: {
        width: '100%',
        maxWidth: 300,
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
    modalContainer: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        maxHeight: '90%',
    },
    modalContentTablet: {
        maxWidth: 600,
        alignSelf: 'center',
        width: '100%',
        borderRadius: 24,
        marginBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#1F2937',
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
    categoryInput: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
    },
    categoryInputText: {
        flex: 1,
        fontSize: 16,
        color: '#374151',
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
        marginBottom: 16,
    },
    categoryList: {
        marginBottom: 12,
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
    errorText: {
        color: '#EF4444',
        fontSize: 14,
        marginBottom: 16,
    },
    modalButton: {
        marginTop: 39,
        width: '50%',
        left:'25%',
    },
    typeSelector: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    typeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderWidth: 1,
        borderRadius:33,
        borderColor: '#D1D5DB',
        backgroundColor: '#F9FAFB',
    },
    typeButtonActive: {
        backgroundColor: '#EF4444',
        borderColor: '#EF4444',
    },
    incomeActive: {
        backgroundColor: '#10B981',
        borderColor: '#10B981',
    },
    typeButtonText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#6B7280',
    },
    typeButtonTextActive: {
        color: '#FFFFFF',
    },
    typeIcon: {
        marginRight: 8,
    },
    dropdownOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    dropdown: {
        position: 'absolute',
        right: 20,
        top: 60,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        width: 150,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
        overflow: 'hidden',
    },
    dropdownTablet: {
        width: 180,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    dropdownIcon: {
        marginRight: 12,
    },
    dropdownItemText: {
        fontSize: 16,
        color: '#374151',
    },
    filteredTransactionsScroll: {
        maxHeight: 200,
        marginBottom: 16,
    },
    filteredTransactionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 8,
        paddingHorizontal: 4,
    },
    filteredTransactionText: {
        fontSize: 13,
        color: '#4B5563',
        marginLeft: 4,
        flexShrink: 1,
    },
    noDataText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginVertical: 12,
    },
});

export default TransactionsScreen;