// backend/src/controllers/transactionController.ts
import { Request, Response } from 'express';
import { AuthRequest } from '../types/express/custom-express';
import {
    addTransaction as addTransactionService,
    updateTransaction as updateTransactionService,
    deleteTransaction as deleteTransactionService,
    getTransaction, getUserTransactions,
} from '../services/firebaseService';
import { TransactionSchema } from '../schemas/financeSchema';
import { logger } from '../utils/logger';

export const getTransactions = async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    try {
        const { userId, startDate, endDate } = req.query;
        if (typeof userId !== 'string' || userId !== authReq.user.uid) {
            return res.status(403).json({ error: 'Unauthorized userId' });
        }
        const transactions = await getUserTransactions(
            userId,
            100,
            undefined,
            startDate ? new Date(startDate as string) : undefined,
            endDate ? new Date(endDate as string) : undefined
        );
        return res.status(200).json({ transactions });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Error fetching transactions', { error: errorMessage });
        return res.status(500).json({ error: errorMessage });
    }
};

export const addTransaction = async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    try {
        const validated = TransactionSchema.parse(req.body);
        if (validated.userId !== authReq.user.uid) {
            return res.status(403).json({ error: 'Unauthorized userId' });
        }
        const transactionId = await addTransactionService(validated);
        logger.info('Transaction added', { transactionId, userId: authReq.user.uid });
        return res.status(201).json({ id: transactionId });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Error adding transaction', { error: errorMessage });
        return res.status(400).json({ error: errorMessage });
    }
};

export const updateTransaction = async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    try {
        const { id } = req.params;
        const validated = TransactionSchema.parse({ ...req.body, id });
        if (validated.userId !== authReq.user.uid) {
            return res.status(403).json({ error: 'Unauthorized userId' });
        }
        await updateTransactionService(id, validated);
        logger.info('Transaction updated', { transactionId: id, userId: authReq.user.uid });
        return res.status(200).json({ message: 'Transaction updated' });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Error updating transaction', { error: errorMessage });
        return res.status(400).json({ error: errorMessage });
    }
};

export const deleteTransaction = async (req: Request, res: Response) => {
    const authReq = req as AuthRequest;
    try {
        const { id } = req.params;
        logger.info('Received DELETE request for transaction', { transactionId: id, userId: authReq.user.uid });
        const transaction = await getTransaction(id);
        if (!transaction) {
            logger.warn('Transaction not found', { transactionId: id, userId: authReq.user.uid });
            return res.status(403).json({ error: 'Unauthorized or transaction not found' });
        }
        if (transaction.userId !== authReq.user.uid) {
            logger.warn('Unauthorized delete attempt', { transactionId: id, userId: authReq.user.uid, transactionUserId: transaction.userId });
            return res.status(403).json({ error: 'Unauthorized or transaction not found' });
        }
        await deleteTransactionService(id);
        logger.info('Transaction deleted successfully', { transactionId: id, userId: authReq.user.uid });
        return res.status(200).json({ message: 'Transaction deleted' });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logger.error('Error deleting transaction', { error: errorMessage, transactionId: req.params.id, userId: authReq.user.uid });
        return res.status(400).json({ error: errorMessage });
    }
};