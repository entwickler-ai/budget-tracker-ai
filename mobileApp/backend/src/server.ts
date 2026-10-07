// backend/src/server.ts
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { setupMiddleware } from './config/middleware';
import { logger } from './utils/logger';

const app = express();
const port = process.env.PORT || 3000;

setupMiddleware(app);

app.listen(port, () => {
    logger.info(`For testing the BudgetTrackerAi API, click on Server link: Server running on port: http://localhost:${port}/test`);
});