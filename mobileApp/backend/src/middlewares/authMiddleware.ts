// backend/src/middlewares/authMiddleware.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AuthRequest } from '../types/express/custom-express';
import admin from 'firebase-admin';
import { logger } from '../utils/logger';

const authMiddleware: RequestHandler = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Missing or invalid token' });
            return;
        }

        const token = authHeader.split('Bearer ')[1];
        const decodedToken = await admin.auth().verifyIdToken(token);
        (req as AuthRequest).user = decodedToken;

        logger.info('User authenticated', { userId: decodedToken.uid });
        next();
    } catch (error: any) {
        logger.error('Authentication error', { error: error.message });
        res.status(401).json({ error: 'Unauthorized' });
    }
};

export default authMiddleware;