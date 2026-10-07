// backend/src/routes/insightRoutes.ts
import express from 'express';
import { generateInsight, getInsights } from '../controllers/insightController';
import authMiddleware from '../middlewares/authMiddleware';

const router = express.Router();

router.post('/insights', authMiddleware, generateInsight);
router.get('/insights', authMiddleware, getInsights);

export default router;