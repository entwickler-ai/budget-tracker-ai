// backend/src/middlewares/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const errorHandler = (
    err: any,
    _req: Request,
    res: Response,
    _next: NextFunction
): void => {
    logger.error('Error occurred', {
        message: err.message,
        stack: err.stack,
        status: err.status || 500
    });
    const status = err.status || 500;
    const message = process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message;
    res.status(status).json({ error: message });
};