// backend/src/routes/transactionRoutes.ts
import express from 'express';
import {getTransactions, addTransaction, updateTransaction, deleteTransaction} from '../controllers/transactionController';
import authMiddleware from '../middlewares/authMiddleware';

const router = express.Router();

router.get('/', authMiddleware, getTransactions);
router.post('/', authMiddleware, addTransaction);
router.put('/:id', authMiddleware, updateTransaction);
router.delete('/:id', authMiddleware, deleteTransaction);

export default router;