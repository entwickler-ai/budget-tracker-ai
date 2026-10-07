//BudgetTrackerAi/src/screens/dashboard/DashboardScreen.tsx
import React, { useState, useCallback, JSX } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Dimensions,
    ActivityIndicator,
    RefreshControl,
    Platform,
    TouchableOpacity,
    Modal,
    FlatList,
    TextInput,
    Image,
    KeyboardAvoidingView,
} from 'react-native';
import { useAuth } from '@hooks/useAuth';
import { useTransactions } from '@hooks/useTransactions';
import { useBudgets } from '@hooks/useBudgets';
import { useInsights } from '@hooks/useInsights';
import { formatCurrency } from '@utils/formatCurrency';
import { MaterialIcons } from '@expo/vector-icons';
import Button from '@components/Button';
import * as Haptics from 'expo-haptics';
import FinancialPieChart from '@components/Charts/FinancialPieChart';
import { getApiUrl } from '@services/api';
import { Budget, timestampToString, Transaction } from '@/types/finance';
import { CATEGORIES, CATEGORY_CONFIG } from '@/constants/categories';

const SCREEN_WIDTH = Dimensions.get('window').width;

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

const DashboardScreen = () => {
    const { user } = useAuth();
    const {
        summary,
        refreshing: transactionsRefreshing,
        onRefresh: onRefreshTransactions,
        transactions,
    } = useTransactions(user?.uid || '');
    const { budgets } = useBudgets(user?.uid || '');
    const {
        insights,
        fetchInsights,
        loading: insightsLoading,
        error,
    } = useInsights(user?.uid || '');
    const [tipVisible, setTipVisible] = useState(true);
    const [forecastVisible, setForecastVisible] = useState(true);
    const [filterModalVisible, setFilterModalVisible] = useState(false);
    const [notificationModalVisible, setNotificationModalVisible] = useState(false);
    const [notificationMessage, setNotificationMessage] = useState('');
    const [transactionFilterModalVisible, setTransactionFilterModalVisible] = useState(false);
    const [filterType, setFilterType] = useState<string | null>(null);
    const [filterCategory, setFilterCategory] = useState<string | null>(null);
    const [minAmount, setMinAmount] = useState('');
    const [maxAmount, setMaxAmount] = useState('');
    const [filterDate, setFilterDate] = useState<Date | null>(null);
    const [showCalendar, setShowCalendar] = useState(false);
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const hasFinancialData = summary.income > 0 || summary.expenses > 0;
    const savingsRate = hasFinancialData
        ? ((summary.income - summary.expenses) / summary.income) * 100
        : 0;
    const expenseRatio = hasFinancialData
        ? (summary.expenses / summary.income) * 100
        : 0;
    const isLowSavings = hasFinancialData && savingsRate < 30;
    const isHighExpenses = hasFinancialData && expenseRatio > 60;
    const isBothConditions = isLowSavings && isHighExpenses;

    const getNotificationIcon = () => {
        if (isBothConditions) return 'warning';
        if (isLowSavings) return 'savings';
        if (isHighExpenses) return 'money-off';
        return 'notifications';
    };

    const getNotificationIconColor = () => {
        return isBothConditions ? '#007AFF' : (isLowSavings || isHighExpenses) ? '#EF4444' : '#007AFF';
    };

    const fetchUserInsights = useCallback(async () => {
        if (!user?.uid || summary.income + summary.expenses <= 0) {
            return;
        }

        const apiUrl = getApiUrl();

        try {
            await fetchInsights(
                `Based on monthly income of ${formatCurrency(
                    summary.income
                )} and expenses of ${formatCurrency(
                    summary.expenses
                )}, provide one specific, actionable financial tip. Limit to 20 words.`,
                transactions
            );

            await fetchInsights(
                `Based on income of ${formatCurrency(
                    summary.income
                )}, expenses of ${formatCurrency(
                    summary.expenses
                )}, and savings rate of ${savingsRate.toFixed(
                    1
                )}%, predict likely financial outcome this month in under 20 words.`,
                transactions
            );

            if (isBothConditions) {
                await fetchInsights(
                    `Savings rate ${savingsRate.toFixed(1)}% and expenses ${expenseRatio.toFixed(1)}% of income. Suggest urgent action in 20 words.`,
                    transactions
                ).then((response) => setNotificationMessage(response || 'Reduce spending and increase savings urgently to avoid financial strain.'));
            } else if (isLowSavings) {
                await fetchInsights(
                    `Savings rate is ${savingsRate.toFixed(1)}%. Provide specific advice to improve savings in 20 words.`,
                    transactions
                ).then((response) => setNotificationMessage(response || 'Cut non-essential expenses and automate savings to boost your savings rate.'));
            } else if (isHighExpenses) {
                await fetchInsights(
                    `Expenses are ${expenseRatio.toFixed(1)}% of income. Suggest cost-cutting measures in 20 words.`,
                    transactions
                ).then((response) => setNotificationMessage(response || 'Review subscriptions and discretionary spending to reduce expenses significantly.'));
            }
        } catch (err) {
            console.error('Failed to fetch insights:', err);
        }
    }, [user?.uid, summary.income, summary.expenses, fetchInsights, transactions, isLowSavings, isHighExpenses, isBothConditions, savingsRate, expenseRatio]);

    const onRefresh = useCallback(async () => {
        try {
            await onRefreshTransactions();
            if (Platform.OS !== 'web') {
                await Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Success
                );
            }
        } catch (err) {
            console.error('Error refreshing data:', err);
            if (Platform.OS !== 'web') {
                await Haptics.notificationAsync(
                    Haptics.NotificationFeedbackType.Error
                );
            }
        }
    }, [onRefreshTransactions]);

    const chartData = [
        {
            name: 'Income',
            amount: summary.income,
            color: '#22C55E',
            legendFontColor: '#000000',
            legendFontSize: 11,
            icon: 'arrow-upward' as keyof typeof MaterialIcons.glyphMap,
        },
        {
            name: 'Expenses',
            amount: summary.expenses,
            color: '#EF4444',
            legendFontColor: '#000000',
            legendFontSize: 11,
            icon: 'arrow-downward' as keyof typeof MaterialIcons.glyphMap,
        },
        {
            name: 'Balance',
            amount: Math.abs(summary.income - summary.expenses),
            color: '#3B82F6',
            legendFontColor: '#000000',
            legendFontSize: 11,
            icon: 'account-balance' as keyof typeof MaterialIcons.glyphMap,
        },
    ].filter(item => item.amount > 0);

    const categoryData = budgets.map((budget: Budget) => {
        const relevantTransactions = transactions.filter(tx =>
            tx.category === budget.category &&
            tx.type === 'expense' &&
            new Date(tx.date) >= new Date(timestampToString(budget.startDate))
        );
        const totalSpent = relevantTransactions.reduce((sum, tx) => sum + tx.amount, 0);
        return {
            name: budget.category,
            spent: totalSpent,
            budget: budget.limit,
            color: CATEGORY_CONFIG[budget.category as keyof typeof CATEGORY_CONFIG]?.color || '#6B7280',
            icon: CATEGORY_CONFIG[budget.category as keyof typeof CATEGORY_CONFIG]?.icon || 'help',
        };
    });

    const chartConfig = {
        color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        labelColor: () => '#000000',
    };

    const tip = insights[0] || '';
    const forecast = insights[1] || '';

    const handleFilterSelect = (type: string) => {
        setFilterType(type);
        setFilterModalVisible(false);
        setTransactionFilterModalVisible(true);
        setFilteredTransactions(transactions);
    };

    const handleCategorySelect = (category: string) => {
        setFilterCategory(category);
        setShowCategoryPicker(false);
    };

    const applyTransactionFilter = useCallback(() => {
        const min = parseFloat(minAmount) || 0;
        const max = parseFloat(maxAmount) || Infinity;

        const filtered = transactions.filter((tx) => {
            const amount = tx.amount;
            const matchesType =
                filterType === 'By Income' ? tx.type === 'income' :
                    filterType === 'By Expenses' ? tx.type === 'expense' :
                        true;
            const matchesCategory = filterCategory ? tx.category === filterCategory : true;
            const matchesDate = filterDate
                ? new Date(tx.date).toDateString() === filterDate.toDateString()
                : true;
            return amount >= min && amount <= max && matchesType && matchesCategory && matchesDate;
        });

        setFilteredTransactions(filtered);
    }, [minAmount, maxAmount, filterDate, filterType, filterCategory, transactions]);

    const clearTransactionFilter = () => {
        setMinAmount('');
        setMaxAmount('');
        setFilterDate(null);
        setFilterCategory(null);
        setShowCalendar(false);
        setShowCategoryPicker(false);
        setFilteredTransactions(transactions);
    };

    React.useEffect(() => {
        if (transactionFilterModalVisible) {
            applyTransactionFilter();
        }
    }, [minAmount, maxAmount, filterDate, filterType, filterCategory, applyTransactionFilter, transactionFilterModalVisible]);

    if (!user) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Loading user data...</Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
                <RefreshControl
                    refreshing={transactionsRefreshing}
                    onRefresh={onRefresh}
                    colors={['#007AFF']}
                    tintColor="#007AFF"
                />
            }
        >
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Image
                        source={require('../../assets/icon.png')}
                        style={[styles.logo, { borderRadius: 55 }]}
                        resizeMode="contain"
                    />
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.appName}>BudgetTrackerAI</Text>
                        <Text style={styles.welcomeBox}>
                            Welcome ( {user.displayName?.split('@')[0] || 'User'} )
                        </Text>
                    </View>
                </View>
                <TouchableOpacity
                    style={styles.notificationButton}
                    onPress={() => (summary.income > 0 || summary.expenses > 0) && (isLowSavings || isHighExpenses) && setNotificationModalVisible(true)}
                    disabled={summary.income === 0 && summary.expenses === 0}
                >
                    {(summary.income > 0 || summary.expenses > 0) && (isLowSavings || isHighExpenses) && (
                        <View style={styles.notificationBadge}>
                            <Text style={styles.notificationCount}>{isBothConditions ? '2' : '1'}</Text>
                        </View>
                    )}
                    <MaterialIcons
                        name={getNotificationIcon()}
                        size={24}
                        color={getNotificationIconColor()}
                    />
                </TouchableOpacity>
            </View>

            <Modal
                animationType="slide"
                transparent={true}
                visible={notificationModalVisible}
                onRequestClose={() => setNotificationModalVisible(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>
                            {isBothConditions ? 'Financial Alert' : isLowSavings ? 'Low Savings Alert' : 'High Expenses Alert'}
                        </Text>
                        <Text style={styles.modalMessage}>
                            {notificationMessage}
                        </Text>
                        <Button
                            title="Close"
                            onPress={() => setNotificationModalVisible(false)}
                            style={styles.closeButton}
                        />
                    </View>
                </View>
            </Modal>

            <View style={styles.summaryCard}>
                <TouchableOpacity
                    style={styles.monthSelector}
                    onPress={() => setFilterModalVisible(true)}
                >
                    <View style={styles.monthSelectorContent}>
                        <MaterialIcons
                            name="calendar-today"
                            size={20}
                            color="#007AFF"
                            style={styles.calendarIcon}
                        />
                        <Text style={styles.monthTitle}>
                            {new Date(currentYear, currentMonth).toLocaleString('default', {
                                month: 'long',
                                year: 'numeric',
                            })}
                        </Text>
                    </View>
                </TouchableOpacity>

                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={filterModalVisible}
                    onRequestClose={() => setFilterModalVisible(false)}
                >
                    <View style={styles.modalContainer}>
                        <View style={styles.modalContent}>
                            <Text style={styles.modalTitle}>Filter Transactions</Text>
                            <TouchableOpacity style={styles.filterOption} onPress={() => handleFilterSelect('By Income')}>
                                <Text style={styles.filterText}>By Income</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.filterOption} onPress={() => handleFilterSelect('By Expenses')}>
                                <Text style={styles.filterText}>By Expenses</Text>
                            </TouchableOpacity>
                            <Button
                                title="Close"
                                onPress={() => setFilterModalVisible(false)}
                                style={styles.closeButton}
                            />
                        </View>
                    </View>
                </Modal>

                <Modal
                    animationType="slide"
                    transparent={true}
                    visible={transactionFilterModalVisible}
                    onRequestClose={() => {
                        clearTransactionFilter();
                        setTransactionFilterModalVisible(false);
                    }}
                >
                    <KeyboardAvoidingView
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        style={{ flex: 1 }}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 30}
                    >
                        <View style={styles.modalContainer}>
                            <View style={[styles.modalContent, styles.transactionFilterModal, Platform.OS === 'ios' && styles.modalContentIOS]}>
                                <Text style={styles.modalTitle}>{filterType} Filter</Text>
                                <Text style={styles.inputLabel}>Minimum Amount ($)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={minAmount}
                                    onChangeText={setMinAmount}
                                    keyboardType="numeric"
                                    placeholder="Enter minimum amount"
                                />
                                <Text style={styles.inputLabel}>Maximum Amount ($)</Text>
                                <TextInput
                                    style={styles.input}
                                    value={maxAmount}
                                    onChangeText={setMaxAmount}
                                    keyboardType="numeric"
                                    placeholder="Enter maximum amount"
                                />
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
                                                const category = item as string;
                                                const categoryConfig = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG];
                                                return (
                                                    <TouchableOpacity
                                                        style={styles.categoryItem}
                                                        onPress={() => handleCategorySelect(category)}
                                                    >
                                                        <MaterialIcons
                                                            name={categoryConfig.icon}
                                                            size={20}
                                                            color={categoryConfig.color}
                                                            style={styles.categoryIcon}
                                                        />
                                                        <Text style={styles.categoryItemText}>{category}</Text>
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
                                <View style={styles.filterButtonContainer}>
                                    <Button
                                        title="Clear Filter"
                                        onPress={clearTransactionFilter}
                                        style={styles.filterButton}
                                        variant="outline"
                                    />
                                </View>
                                <FlatList
                                    data={filteredTransactions}
                                    keyExtractor={(item) => item.id}
                                    renderItem={({ item }) => {
                                        const categoryConfig = CATEGORY_CONFIG[item.category as keyof typeof CATEGORY_CONFIG] || {
                                            icon: 'help',
                                            color: '#6B7280',
                                        };
                                        return (
                                            <View style={styles.transactionItem}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    <MaterialIcons
                                                        name={categoryConfig.icon}
                                                        size={20}
                                                        color={categoryConfig.color}
                                                        style={{ marginRight: 8 }}
                                                    />
                                                    <Text style={styles.transactionText}>
                                                        {item.description} - {formatCurrency(item.amount)} ({item.type}, {item.category})
                                                    </Text>
                                                </View>
                                            </View>
                                        );
                                    }}
                                    style={styles.transactionList}
                                />
                                {!showCalendar && !showCategoryPicker && (
                                    <Button
                                        title="Close"
                                        onPress={() => {
                                            clearTransactionFilter();
                                            setTransactionFilterModalVisible(false);
                                        }}
                                        style={styles.closeButton}
                                    />
                                )}
                            </View>
                        </View>
                    </KeyboardAvoidingView>
                </Modal>

                <Text style={styles.cardTitle}>Financial Overview</Text>
                {chartData.length > 0 ? (
                    <View>
                        <FinancialPieChart
                            chartData={chartData}
                            width={SCREEN_WIDTH - 80}
                            chartConfig={chartConfig}
                            categoryData={categoryData}
                            showOverallStatus={true}
                        />

                        {insightsLoading ? (
                            <View style={styles.insightLoadingContainer}>
                                <ActivityIndicator
                                    size="small"
                                    color="#007AFF"
                                />
                                <Text style={styles.loadingText}>
                                    Generating insights...
                                </Text>
                            </View>
                        ) : error ? (
                            <View style={styles.errorContainer}>
                                <Text style={styles.errorText}>
                                    {error || 'Unable to load insights. Please try again.'}
                                </Text>
                                <Button
                                    title="Retry"
                                    onPress={() => {
                                        fetchUserInsights();
                                    }}
                                    variant="outline"
                                    size="small"
                                    style={styles.retryButton}
                                />
                            </View>
                        ) : (
                            <>
                                {tip && tipVisible && (
                                    <View style={styles.tipContainer}>
                                        <View style={styles.insightHeader}>
                                            <MaterialIcons
                                                name="lightbulb-outline"
                                                size={20}
                                                color="#007AFF"
                                            />
                                            <Text style={styles.insightTitle}>
                                                Financial Tip
                                            </Text>
                                            <TouchableOpacity
                                                style={styles.dismissButton}
                                                onPress={() =>
                                                    setTipVisible(false)
                                                }
                                            >
                                                <MaterialIcons
                                                    name="close"
                                                    size={16}
                                                    color="#6B7280"
                                                />
                                            </TouchableOpacity>
                                        </View>
                                        <Text style={styles.tipText}>
                                            {tip}
                                        </Text>
                                    </View>
                                )}

                                {forecast && forecastVisible && (
                                    <View style={styles.forecastContainer}>
                                        <View style={styles.insightHeader}>
                                            <MaterialIcons
                                                name="trending-up"
                                                size={20}
                                                color="#007AFF"
                                            />
                                            <Text style={styles.insightTitle}>
                                                Monthly Forecast
                                            </Text>
                                            <TouchableOpacity
                                                style={styles.dismissButton}
                                                onPress={() =>
                                                    setForecastVisible(false)
                                                }
                                            >
                                                <MaterialIcons
                                                    name="close"
                                                    size={16}
                                                    color="#6B7280"
                                                />
                                            </TouchableOpacity>
                                        </View>
                                        <Text style={styles.forecastText}>
                                            {forecast}
                                        </Text>
                                    </View>
                                )}

                                {(!tip || !tipVisible) &&
                                    (!forecast || !forecastVisible) && (
                                        <Button
                                            title="Get Financial Insights (Tip & Forecast)"
                                            onPress={() => {
                                                setTipVisible(true);
                                                setForecastVisible(true);
                                                fetchUserInsights();
                                            }}
                                            size="small"
                                            style={styles.insightButton}
                                        />
                                    )}
                            </>
                        )}

                        <View style={styles.savingsRateContainer}>
                            <Text style={styles.savingsRateLabel}>
                                Your Savings Rate
                            </Text>
                            <Text
                                style={[
                                    styles.savingsRateValue,
                                    {
                                        color:
                                            savingsRate > 10
                                                ? '#22C55E'
                                                : savingsRate > 0
                                                    ? '#F59E0B'
                                                    : '#EF4444',
                                    },
                                ]}
                            >
                                {savingsRate.toFixed(1)}%
                            </Text>
                            <Text style={styles.savingsRateDescription}>
                                {savingsRate > 20
                                    ? 'Excellent! Keep it up!'
                                    : savingsRate > 10
                                        ? 'Good progress!'
                                        : savingsRate > 0
                                            ? 'Room for improvement'
                                            : 'Action needed'}
                            </Text>
                        </View>
                    </View>
                ) : (
                    <Text style={styles.noDataText}>
                        No financial data available.
                    </Text>
                )}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 32,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 14,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    logo: {
        width: 40,
        height: 40,
        marginRight: 10,
    },
    headerTextContainer: {
        flexDirection: 'column',
    },
    appName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000000',
    },
    welcomeBox: {
        backgroundColor: '#00C26E',
        borderRadius: 33,
        paddingHorizontal: 12,
        paddingVertical: 6,
        color: '#ffffff',
        fontWeight: '600',
        fontSize: 14,
        overflow: 'hidden',
        marginTop: 2,
    },
    notificationButton: {
        backgroundColor: '#F3F4F6',
        borderRadius: 20,
        padding: 8,
        position: 'relative',
    },
    notificationBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#EF4444',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    notificationCount: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '600',
    },
    summaryCard: {
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 6,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#000000',
        marginBottom: 16,
        textAlign: 'center',
    },
    monthSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        padding: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#D1D5DB',
        backgroundColor: '#F9FAFB',
    },
    monthSelectorContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    calendarIcon: {
        marginRight: 8,
    },
    monthTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#007AFF',
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 20,
        width: '80%',
        alignItems: 'center',
    },
    modalContentIOS: {
        paddingBottom: 40,
    },
    transactionFilterModal: {
        maxHeight: '90%',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 16,
    },
    modalMessage: {
        fontSize: 16,
        color: '#111827',
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 24,
    },
    filterOption: {
        padding: 12,
        width: '100%',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    filterText: {
        fontSize: 16,
        color: '#111827',
    },
    closeButton: {
        marginTop: 16,
        width: '100%',
    },
    inputLabel: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 8,
        alignSelf: 'flex-start',
    },
    input: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 16,
        width: '100%',
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
        color: '#111827',
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
        textAlign: 'center',
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
    filterButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: 16,
    },
    filterButton: {
        flex: 1,
        marginHorizontal: 4,
    },
    transactionList: {
        maxHeight: 150,
        marginBottom: 16,
        width: '100%',
    },
    transactionItem: {
        padding: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    transactionText: {
        fontSize: 14,
        color: '#111827',
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
    categoryIcon: {
        marginRight: 8,
    },
    categoryItemText: {
        fontSize: 15,
        color: '#374151',
        flex: 1,
    },
    categoryList: {
        marginBottom: 12,
    },
    cancelCategoryButton: {
        marginTop: 8,
    },
    insightHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    insightTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#007AFF',
        marginLeft: 6,
        flex: 1,
    },
    dismissButton: {
        padding: 4,
    },
    tipContainer: {
        backgroundColor: '#EEF2FF',
        borderRadius: 12,
        padding: 14,
        marginTop: 12,
        width: '100%',
        borderLeftWidth: 4,
        borderLeftColor: '#007AFF',
    },
    tipText: {
        fontSize: 14,
        color: '#111827',
        lineHeight: 20,
    },
    forecastContainer: {
        backgroundColor: '#F0FDF4',
        borderRadius: 12,
        padding: 14,
        marginTop: 12,
        width: '100%',
        borderLeftWidth: 4,
        borderLeftColor: '#22C55E',
    },
    forecastText: {
        fontSize: 14,
        color: '#111827',
        lineHeight: 20,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 12,
    },
    insightLoadingContainer: {
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 8,
    },
    errorContainer: {
        alignItems: 'center',
        marginTop: 12,
    },
    errorText: {
        fontSize: 14,
        color: '#EF4444',
        textAlign: 'center',
        marginBottom: 8,
    },
    retryButton: {
        width: 100,
    },
    insightButton: {
        marginTop: 12,
    },
    savingsRateContainer: {
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 12,
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 12,
        width: '100%',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    savingsRateLabel: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 4,
    },
    savingsRateValue: {
        fontSize: 32,
        fontWeight: '500',
    },
    savingsRateDescription: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 4,
    },
    noDataText: {
        fontSize: 16,
        color: '#6B7280',
        textAlign: 'center',
        marginTop: 20,
    },
});

export default DashboardScreen;