// BudgetTrackerAi/utils/formatCurrency.ts
export const formatCurrency = (amount: number | string): string => {
    const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    if (isNaN(numericAmount)) {
        console.warn('Invalid amount provided to formatCurrency:', amount);
        return '€0,00';
    }
    return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
    }).format(numericAmount);
};