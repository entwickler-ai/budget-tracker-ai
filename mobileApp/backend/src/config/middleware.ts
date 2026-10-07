// backend/src/config/middleware.ts
import express, { Express } from 'express';
import cors from 'cors';
import path from 'path';
import rateLimit from 'express-rate-limit';
import insightRoutes from '../routes/insightRoutes';
import { errorHandler } from '../middlewares/errorHandler';
import transactionRoutes from '../routes/transactionRoutes';
import budgetRoutes from '../routes/budgetRoutes';

export const setupMiddleware = (app: Express): void => {
    const allowedOrigins = process.env.NODE_ENV === 'production'
        ? ['https://budgettrackerai-7d3d3.web.app']
        : [
            'http://localhost:3000',
            'http://localhost:8081',
            'http://localhost:19006', // Expo dev server
            'https://ypmzhwa-anonymous-8081.exp.direct',
            'https://00c5-2a01-599-841-be49-153a-b6de-48f8-fec7.ngrok-free.app',
        ];

    app.set('trust proxy', 1);

    app.use(cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    }));

    app.options('*', cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true,
    }));

    app.use(rateLimit({
        windowMs: 15 * 60 * 1000,
        max: 100,
    }));

    app.use(express.json());
    app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));
    app.get('/test', (_, res) => {
        res.sendFile(path.join(__dirname, '..', 'assets', 'html', 'test.html'));
    });

    app.use('/api', insightRoutes);
    app.use('/api/transactions', transactionRoutes);
    app.use('/api/budgets', budgetRoutes);

    app.use(errorHandler);
};