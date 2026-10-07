// backend/src/routes/budgetRoutes.ts
import express from 'express';
import {getBudgets, addBudget, updateBudget, deleteBudget} from '../controllers/budgetController';
import authMiddleware from '../middlewares/authMiddleware';

const router = express.Router();

router.get('/', authMiddleware, getBudgets);
router.post('/', authMiddleware, addBudget);
router.put('/:id', authMiddleware, updateBudget);
router.delete('/:id', authMiddleware, deleteBudget);

export default router;