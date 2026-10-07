// backend/src/controllers/budgetController.ts
import { Request, Response } from 'express';
import { AuthRequest } from '../types/express/custom-express';
import {
    addBudget as addBudgetService,
    updateBudget as updateBudgetService,
    deleteBudget as deleteBudgetService,
    getBudget, getUserBudgets,
} from '../services/firebaseService';
import { BudgetSchema } from '../schemas/financeSchema';
import { logger } from '../utils/logger';


export const getBudgets = async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    try {
        const { userId, startDate, endDate } = req.query;
        if (typeof userId !== 'string' || userId !== authReq.user.uid) {
            return res.status(403).json({ error: 'Unauthorized userId' });
        }
        const budgets = await getUserBudgets(
            userId,
            100,
            startDate ? new Date(startDate as string) : undefined,
            endDate ? new Date(endDate as string) : undefined
        );
        return res.status(200).json({ budgets });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Error fetching budgets', { error: errorMessage });
        return res.status(500).json({ error: errorMessage });
    }
};

export const addBudget = async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    try {
        const validated = BudgetSchema.parse(req.body);
        if (validated.userId !== authReq.user.uid) {
            return res.status(403).json({ error: 'Unauthorized userId' });
        }
        const budgetId = await addBudgetService(validated);
        logger.info('Budget added', { budgetId, userId: authReq.user.uid });
        return res.status(201).json({ id: budgetId });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Error adding budget', { error: errorMessage });
        return res.status(400).json({ error: errorMessage });
    }
};

export const updateBudget = async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    try {
        const { id } = req.params;
        const validated = BudgetSchema.parse({ ...req.body, id });
        if (validated.userId !== authReq.user.uid) {
            return res.status(403).json({ error: 'Unauthorized userId' });
        }
        await updateBudgetService(id, validated);
        logger.info('Budget updated', { budgetId: id, userId: authReq.user.uid });
        return res.status(200).json({ message: 'Budget updated' });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Error updating budget', { error: errorMessage });
        return res.status(400).json({ error: errorMessage });
    }
};

export const deleteBudget = async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    try {
        const { id } = req.params;
        const budget = await getBudget(id);
        if (!budget || budget.userId !== authReq.user.uid) {
            return res.status(403).json({ error: 'Unauthorized or budget not found' });
        }
        await deleteBudgetService(id);
        logger.info('Budget deleted', { budgetId: id, userId: authReq.user.uid });
        return res.status(200).json({ message: 'Budget deleted' });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Error deleting budget', { error: errorMessage });
        return res.status(400).json({ error: errorMessage });
    }
};