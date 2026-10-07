// BudgetTrackerAi/src/components/Charts/FinancialPieChart.tsx
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    FlatList,
    ScrollView,
    Modal,
    Dimensions,
} from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { MaterialIcons } from '@expo/vector-icons';
import { formatCurrency } from '@utils/formatCurrency';

const SCREEN_WIDTH = Dimensions.get('window').width;

type ChartData = {
    name: string;
    amount: number;
    color: string;
    legendFontColor: string;
    legendFontSize: number;
    icon: keyof typeof MaterialIcons.glyphMap;
};

type CategoryData = {
    name: string;
    spent: number;
    budget: number;
    color: string;
    icon: keyof typeof MaterialIcons.glyphMap;
};

type ChartConfig = {
    color: (opacity?: number) => string;
    labelColor: () => string;
};

type FinancialPieChartProps = {
    chartData: ChartData[];
    width: number;
    chartConfig: ChartConfig;
    categoryData?: CategoryData[];
    showOverallStatus?: boolean;
};

const FinancialPieChart: React.FC<FinancialPieChartProps> = ({
                                                                 chartData,
                                                                 width,
                                                                 chartConfig,
                                                                 categoryData = [],
                                                                 showOverallStatus = true,
                                                             }) => {
    const [minAmount, setMinAmount] = useState('');
    const [maxAmount, setMaxAmount] = useState('');
    const [filterCategory, setFilterCategory] = useState<string | null>(null);
    const [showFilterModal, setShowFilterModal] = useState(false);
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);
    const [filteredCategories, setFilteredCategories] = useState<CategoryData[]>(
        categoryData.filter(item => item.spent > 0 || item.budget > 0)
    );

    const totalSpent = categoryData.reduce((sum: number, item) => sum + item.spent, 0);
    const totalBudget = categoryData.reduce((sum: number, item) => sum + item.budget, 0);

    const overBudgetCategories = categoryData.filter(item => item.spent > item.budget);

    useEffect(() => {
        const min = parseFloat(minAmount) || 0;
        const max = parseFloat(maxAmount) || Infinity;

        const filtered = categoryData
            .filter(item => item.spent > 0 || item.budget > 0)
            .filter(item => {
                const matchesAmount = item.spent >= min && item.spent <= max;
                const matchesCategory = filterCategory ? item.name === filterCategory : true;
                return matchesAmount && matchesCategory;
            });

        setFilteredCategories(filtered);
    }, [minAmount, maxAmount, filterCategory, categoryData]);

    const handleCategorySelect = (category: string) => {
        setFilterCategory(category);
        setShowCategoryPicker(false);
    };

    const clearFilters = () => {
        setMinAmount('');
        setMaxAmount('');
        setFilterCategory(null);
        setShowCategoryPicker(false);
        setFilteredCategories(categoryData.filter(item => item.spent > 0 || item.budget > 0));
    };

    const overallPercentSpent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
    const overallProgressColor = totalSpent > totalBudget ? '#EF4444' : '#22C55E';

    const chartWidth = Math.min(SCREEN_WIDTH - 40, width);
    const chartHeight = Math.min(SCREEN_WIDTH - 40, 220);

    return (
        <View style={styles.container}>

            {/* PieChart direkt unter dem Titel */}
            {chartData.length > 0 ? (
                <View style={styles.chartContainer}>
                    <PieChart
                        data={chartData}
                        width={chartWidth}
                        height={chartHeight}
                        chartConfig={{
                            backgroundColor: '#FFFFFF',
                            backgroundGradientFrom: '#FFFFFF',
                            backgroundGradientTo: '#FFFFFF',
                            color: chartConfig.color,
                            labelColor: chartConfig.labelColor,
                        }}
                        accessor="amount"
                        backgroundColor="transparent"
                        paddingLeft="-10"
                        center={[chartWidth / 2, 0]}
                        absolute
                        hasLegend={false}
                        style={{
                            borderRadius: 2,
                            marginVertical: 1,
                        }}
                    />

                </View>
            ) : (
                <Text style={styles.noDataText}>
                    No financial data available. Add expenses or budgets to see the breakdown.
                </Text>
            )}

            {/* Summary and Overall Status Row */}
            <View style={styles.summaryRow}>
                <View style={styles.summaryContainer}>
                    <Text style={styles.summaryTitle}>Financial Summary</Text>
                    <View style={styles.summaryItems}>
                        {chartData.map((item, index) => (
                            <View key={index} style={styles.summaryItem}>
                                <MaterialIcons name={item.icon} size={20} color={item.color} />
                                <Text style={[styles.summaryText, { color: item.color }]}>
                                    {item.name}: {formatCurrency(item.amount)}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>

                {showOverallStatus && categoryData.length > 0 && (
                    <View style={styles.overallContainer}>
                        <Text style={styles.overallTitle}>Overall Budget Status</Text>
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
                        <View style={styles.overBudgetContainer}>
                            <Text style={styles.overallText}>
                                {overBudgetCategories.length > 0 ? 'Over Budget Categories' : 'All Categories On Track'}
                            </Text>
                            {overBudgetCategories.map((category, index) => (
                                <View key={index} style={styles.overBudgetItem}>
                                    <MaterialIcons name={category.icon} size={16} color={category.color} />
                                    <Text style={styles.overBudgetCategory}>
                                        {category.name}: Over Budget
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}
            </View>

            {categoryData.length > 0 && (
                <View style={styles.categoriesContainer}>
                    <View style={styles.categoriesHeader}>
                        <Text style={styles.categoriesTitle}>Categories</Text>
                        <View style={styles.scrollIndicators}>
                            <MaterialIcons name="chevron-left" size={24} color="#6B7280" />
                            <MaterialIcons name="chevron-right" size={24} color="#6B7280" />
                        </View>
                        <TouchableOpacity
                            style={styles.filterButton}
                            onPress={() => setShowFilterModal(true)}
                        >
                            <MaterialIcons name="filter-list" size={20} color="#007AFF" />
                            <Text style={styles.filterButtonText}>Filter</Text>
                        </TouchableOpacity>
                    </View>

                    <Modal
                        animationType="fade"
                        transparent={true}
                        visible={showFilterModal}
                        onRequestClose={() => {
                            setShowFilterModal(false);
                            setShowCategoryPicker(false);
                        }}
                    >
                        <View style={styles.modalContainer}>
                            <View style={styles.modalContent}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Filter Categories</Text>
                                    <TouchableOpacity
                                        onPress={() => {
                                            setShowFilterModal(false);
                                            setShowCategoryPicker(false);
                                        }}
                                    >
                                        <MaterialIcons name="close" size={24} color="#6B7280" />
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.filterInputContainer}>
                                    <Text style={styles.inputLabel}>Min Amount (€)</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={minAmount}
                                        onChangeText={setMinAmount}
                                        keyboardType="numeric"
                                        placeholder="0,00"
                                    />
                                </View>
                                <View style={styles.filterInputContainer}>
                                    <Text style={styles.inputLabel}>Max Amount (€)</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={maxAmount}
                                        onChangeText={setMaxAmount}
                                        keyboardType="numeric"
                                        placeholder="∞"
                                    />
                                </View>
                                <View style={styles.filterInputContainer}>
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
                                                data={categoryData}
                                                keyExtractor={(item) => item.name}
                                                renderItem={({ item }) => (
                                                    <TouchableOpacity
                                                        style={styles.categoryItem}
                                                        onPress={() => handleCategorySelect(item.name)}
                                                    >
                                                        <MaterialIcons
                                                            name={item.icon}
                                                            size={20}
                                                            color={item.color}
                                                            style={styles.categoryItemIcon}
                                                        />
                                                        <Text style={styles.categoryItemText}>{item.name}</Text>
                                                    </TouchableOpacity>
                                                )}
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
                                </View>
                                <TouchableOpacity onPress={clearFilters} style={styles.clearFilterButton}>
                                    <Text style={styles.clearFilterText}>Clear Filters</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Modal>

                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.categoriesScrollContainer}
                        contentContainerStyle={styles.categoriesScrollContent}
                    >
                        {filteredCategories.length > 0 ? (
                            filteredCategories.map((category, index) => {
                                const remainingAmount = category.spent >= category.budget ? 0 : category.budget - category.spent;
                                const categoryPercentSpent = category.budget > 0 ? (category.spent / category.budget) * 100 : 0;
                                const budgetWidth = Math.min(categoryPercentSpent, 100);
                                const overBudgetWidth = category.spent > category.budget ? Math.min((category.spent / category.budget) * 100 - 100, 100) : 0;

                                return (
                                    <View key={index} style={styles.categoryCard}>
                                        <MaterialIcons name={category.icon} size={24} color={category.color} />
                                        <Text style={styles.categoryName}>{category.name}</Text>
                                        <Text style={styles.categoryAmount}>
                                            Spent: {formatCurrency(category.spent)}
                                        </Text>
                                        <Text style={styles.categoryBudget}>
                                            Budget: {formatCurrency(category.budget)}
                                        </Text>
                                        <View style={styles.categoryProgressBarContainer}>
                                            <View
                                                style={[
                                                    styles.categoryProgressBar,
                                                    {
                                                        width: `${budgetWidth}%`,
                                                        backgroundColor: '#22C55E',
                                                    },
                                                ]}
                                            />
                                            {category.spent > category.budget && (
                                                <View
                                                    style={[
                                                        styles.categoryProgressBar,
                                                        styles.categoryOverBudgetBar,
                                                        {
                                                            width: `${overBudgetWidth}%`,
                                                            backgroundColor: '#EF4444',
                                                        },
                                                    ]}
                                                />
                                            )}
                                        </View>
                                        <Text
                                            style={[
                                                styles.categoryPercent,
                                                {
                                                    color: remainingAmount === 0 ? '#EF4444' : '#22C55E',
                                                },
                                            ]}
                                        >
                                            {formatCurrency(remainingAmount)}
                                        </Text>
                                    </View>
                                );
                            })
                        ) : (
                            <Text style={styles.noDataText}>No categories match the filters.</Text>
                        )}
                    </ScrollView>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        width: '100%',
    },
    overviewTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#17a2b8',
        marginBottom: 6,
        textAlign: 'center',
    },
    chartContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        marginBottom: 6,
        marginRight:'45%',
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: 16,
    },
    summaryContainer: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 16,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12,
    },
    summaryItems: {
        flexDirection: 'column',
        gap: 1,
    },
    summaryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 1,
    },
    summaryText: {
        fontSize: 14,
        fontWeight: '500',
    },
    overallContainer: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 9,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    overallTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12,
    },
    progressBarContainer: {
        height: 8,
        backgroundColor: '#E5E7EB',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
        position: 'relative',
    },
    progressBar: {
        height: '100%',
        borderRadius: 4,
    },
    overBudgetContainer: {
        flexDirection: 'column',
    },
    overBudgetItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 1,
    },
    overBudgetCategory: {
        fontSize: 13,
        color: '#4B5563',
        marginLeft: 1,
    },
    overallText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#4B5563',
        marginBottom: 8,
    },
    noDataText: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
        marginVertical: 20,
        paddingHorizontal: 16,
    },
    categoriesContainer: {
        width: '100%',
        marginTop: 6,
    },
    categoriesHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    categoriesTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 6,
    },
    filterButtonText: {
        fontSize: 14,
        color: '#007AFF',
        fontWeight: '600',
        marginLeft: 1,
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
        width: '90%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
    },
    filterInputContainer: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: '#D1D5DB',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: '#FFFFFF',
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
    },
    categoryPicker: {
        marginTop: 8,
        maxHeight: 200,
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
        maxHeight: 150,
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
    },
    clearFilterText: {
        fontSize: 14,
        color: '#007AFF',
        fontWeight: '600',
    },
    categoriesScrollContainer: {
        width: '100%',
    },
    categoriesScrollContent: {
        flexDirection: 'row',
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    categoryCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 12,
        width: 160,
        marginHorizontal: 6,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    categoryName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#1F2937',
        marginTop: 8,
    },
    categoryAmount: {
        fontSize: 13,
        color: '#4B5563',
        marginTop: 4,
    },
    categoryBudget: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 2,
    },
    categoryProgressBarContainer: {
        height: 6,
        backgroundColor: '#E5E7EB',
        borderRadius: 3,
        overflow: 'hidden',
        marginTop: 4,
        position: 'relative',
        width: '100%',
    },
    categoryProgressBar: {
        height: '100%',
        borderRadius: 3,
    },
    categoryOverBudgetBar: {
        position: 'absolute',
        left: 0,
        top: 0,
    },
    categoryPercent: {
        fontSize: 13,
        fontWeight: '600',
        marginTop: 4,
    },
    scrollIndicators: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});

export default FinancialPieChart;