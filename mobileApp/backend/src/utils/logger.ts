// backend/src/utils/logger.ts
import winston from 'winston';

const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.printf(({ level, message, timestamp }) => {
        return `[${timestamp}] ${level}: ${message}`;
    })
);

export const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
    ]
});

if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: consoleFormat,
    }));
}