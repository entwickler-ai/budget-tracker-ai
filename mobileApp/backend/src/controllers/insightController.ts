// backend/src/controllers/insightController.ts
import { Request, Response } from 'express';
import { AuthRequest } from '../types/express/custom-express';
import { getUserTransactions, getUserBudgets } from '../services/firebaseService';
import { generateFinancialPrompt } from '../utils/prompts';
import { getWeather } from '../utils/weather';
import { Transaction, Budget } from '../types/finance';
import OpenAI from 'openai';
import { logger } from '../utils/logger';
import { OPENAI_CONFIG } from '../constants/openaiModel';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const formatPeriod = (period: string): string => {
    switch (period) {
        case 'weekly':
            return 'wöchentliches';
        case 'monthly':
            return 'monatliches';
        case 'yearly':
            return 'jährliches';
        default:
            return period;
    }
};

export const generateInsight = async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    try {
        const { query, userId, transactions: clientTransactions } = req.body;
        if (!query || !userId) {
            logger.error('Missing query or userId', { userId });
            return res.status(400).json({ error: 'Missing query or userId' });
        }
        if (userId !== authReq.user.uid) {
            logger.error('Unauthorized userId', { userId, authUid: authReq.user.uid });
            return res.status(403).json({ error: 'Unauthorized userId' });
        }

        const weatherMatch = query.match(/wetter\s*(?:in\s*([^\?]+))?/i);
        if (weatherMatch) {
            const city = weatherMatch[1]?.trim() || 'Berlin';
            const weatherResponse = await getWeather(city);
            logger.info('Wetteranfrage verarbeitet', { city, response: weatherResponse });
            return res.json({ result: weatherResponse });
        }

        let transactions: Transaction[];
        if (clientTransactions && Array.isArray(clientTransactions)) {
            transactions = clientTransactions as Transaction[];
            logger.info('Using client-provided transactions', { userId, transactionCount: transactions.length });
        } else {
            transactions = await getUserTransactions(userId) as Transaction[];
            logger.info('Fetched transactions from Firebase', { userId, transactionCount: transactions.length });
        }

        const budgets = await getUserBudgets(userId) as Budget[];
        logger.info('Fetched budgets from Firebase', { userId, budgets: budgets.map(b => ({ category: b.category, limit: b.limit })) });

        if (transactions.length === 0 && budgets.length === 0) {
            logger.warn('No transaction or budget data found', { userId });
            return res.status(200).json({ result: 'No financial data available to provide insights. Please add transactions or budgets.' });
        }

        logger.info('Processing transactions for insight generation', { userId });
        const income = transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
        const expenses = transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
        const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

        const categorySpending: Record<string, number> = transactions
            .filter(t => t.type === 'expense')
            .reduce((acc, transaction) => {
                const category = transaction.category || 'Uncategorized';
                acc[category] = (acc[category] || 0) + transaction.amount;
                return acc;
            }, {} as Record<string, number>);

        const topCategories = Object.entries(categorySpending)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([category, amount]) => ({ category, amount }));

        const remainingBudgets: Record<string, number> = budgets.reduce((acc, budget) => {
            const spent = categorySpending[budget.category] || 0;
            acc[budget.category] = budget.limit - spent;
            return acc;
        }, {} as Record<string, number>);

        logger.info('Remaining budgets calculated', { userId, remainingBudgets });

        let customPrompt = '';
        const amountMatch = query.match(/(\d+,\d{2})/);
        if (amountMatch) {
            const amountStr = amountMatch[0];
            const amount = parseFloat(amountStr.replace(',', '.'));
            const matchingTransaction = transactions.find(txn => txn.amount === amount);

            if (matchingTransaction) {
                customPrompt += `\nSpezielle Anfrage: Der Benutzer fragt nach ${amountStr} €. Antworte mit: "Die ${amountStr} € hast du für '${matchingTransaction.description}' ausgegeben. Das war eine ${matchingTransaction.type === 'expense' ? 'Ausgabe' : 'Einnahme'} in der Kategorie '${matchingTransaction.category}' am ${new Date(matchingTransaction.date).toLocaleDateString('de-DE')}. Wenn keine weiteren Informationen gewünscht sind, beende hier."`;
            }
        }

        const budgetQueryMatch = query.match(/Budget für (\w+\s*&\s*\w+|\w+)/i);
        if (budgetQueryMatch) {
            const category = budgetQueryMatch[1];
            const matchingBudget = budgets.find(b => b.category.toLowerCase() === category.toLowerCase());

            if (matchingBudget) {
                const spent = categorySpending[matchingBudget.category] || 0;
                const remaining = matchingBudget.limit - spent;
                customPrompt += `\nSpezielle Anfrage: Der Benutzer fragt nach dem Budget für '${category}'. Antworte mit: "Das Budget für die Kategorie '${matchingBudget.category}' beträgt ${matchingBudget.limit.toFixed(2).replace('.', ',')} €. Es ist ein ${formatPeriod(matchingBudget.period)} Budget, das am ${new Date(matchingBudget.startDate).toLocaleDateString('de-DE')} festgelegt wurde. Du hast ${spent.toFixed(2).replace('.', ',')} € ausgegeben, und dir bleiben ${remaining.toFixed(2).replace('.', ',')} €. Wenn keine weiteren Informationen gewünscht sind, beende hier."`;
            } else {
                customPrompt += `\nSpezielle Anfrage: Der Benutzer fragt nach dem Budget für '${category}'. Antworte mit: "Es gibt kein Budget für die Kategorie '${category}'. Wenn keine weiteren Informationen gewünscht sind, beende hier."`;
            }
        }

        const prompt = generateFinancialPrompt(
            income,
            expenses,
            savingsRate,
            topCategories,
            remainingBudgets,
            transactions,
            budgets,
            query
        ) + customPrompt;

        const response = await openai.chat.completions.create({
            model: OPENAI_CONFIG.MODEL,
            messages: [
                { role: 'system', content: 'You are a helpful financial assistant. Respond in German. When asked about a specific amount (e.g., "120,75 €"), provide the transaction description, category, and date. When asked about a budget for a category, always include the set limit and remaining amount (e.g., "You set a budget of 50 € for Movies & Shows, and you have 34.01 € remaining this month."). If no budget exists for the category, state that explicitly. Follow any special instructions in the prompt.' },
                { role: 'user', content: prompt },
            ],
            max_tokens: OPENAI_CONFIG.MAX_TOKENS,
            temperature: OPENAI_CONFIG.TEMPERATURE,
        });

        logger.info('Successfully generated financial insight', { userId, response: response.choices[0].message.content });
        res.json({ result: response.choices[0].message.content });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        logger.error('Failed to generate insight', { userId: req.body.userId, error: errorMessage });
        res.status(500).json({ error: 'Failed to generate insight.' });
    }
};

export const getInsights = async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    try {
        const { userId } = req.query;
        if (typeof userId !== 'string' || userId !== authReq.user.uid) {
            return res.status(403).json({ error: 'Unauthorized userId' });
        }

        const transactions = await getUserTransactions(userId);
        const budgets = await getUserBudgets(userId);

        const totalIncome = transactions
            .filter((t) => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
        const totalExpenses = transactions
            .filter((t) => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);

        const budgetSummary = budgets.map((b) => ({
            category: b.category,
            limit: b.limit,
            period: b.period,
        }));

        const insights = {
            totalIncome,
            totalExpenses,
            netSavings: totalIncome - totalExpenses,
            budgets: budgetSummary,
        };

        logger.info('Insights generated', { userId });
        return res.status(200).json({ insights });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Error generating insights', { error: errorMessage });
        return res.status(500).json({ error: errorMessage });
    }
};