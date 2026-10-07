// backend/src/config/scripts/seedFirestore.ts -> npm run seed
import admin from 'firebase-admin';
import dotenv from 'dotenv';
import serviceAccount from '../../../serviceAccountKey.json';
import { logger } from '../../utils/logger';

dotenv.config();

try {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
    });
} catch (error) {
    logger.error('Error initializing Firebase Admin:', error);
    process.exit(1);
}

const db = admin.firestore();

const transactions = [
    // User 1: sRP7Ln2ohyVOh5QyT1LIOQIFwey1 (test@fh.de)
    {
        amount: 45.99,
        category: 'Groceries',
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2025-05-01T10:30:00Z')),
        date: admin.firestore.Timestamp.fromDate(new Date('2025-05-01T00:00:00Z')),
        description: 'Supermarkt Einkauf',
        type: 'expense',
        userId: 'sRP7Ln2ohyVOh5QyT1LIOQIFwey1',
    },
    {
        amount: 2000.00,
        category: 'Salary',
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2025-05-01T09:00:00Z')),
        date: admin.firestore.Timestamp.fromDate(new Date('2025-05-01T00:00:00Z')),
        description: 'Gehalt Mai',
        type: 'income',
        userId: 'sRP7Ln2ohyVOh5QyT1LIOQIFwey1',
    },
    {
        amount: 25.50,
        category: 'Dining Out',
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2025-05-02T19:15:00Z')),
        date: admin.firestore.Timestamp.fromDate(new Date('2025-05-02T00:00:00Z')),
        description: 'Pizza Abend',
        type: 'expense',
        userId: 'sRP7Ln2ohyVOh5QyT1LIOQIFwey1',
    },
    {
        amount: 60.00,
        category: 'Fuel',
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2025-05-03T08:45:00Z')),
        date: admin.firestore.Timestamp.fromDate(new Date('2025-05-03T00:00:00Z')),
        description: 'Tanken',
        type: 'expense',
        userId: 'sRP7Ln2ohyVOh5QyT1LIOQIFwey1',
    },
    // User 2: x9MAIprT1lhWOytiDNyG0rmC4Kp2 (admin@fh.de)
    {
        amount: 120.75,
        category: 'Clothing',
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2025-05-01T14:20:00Z')),
        date: admin.firestore.Timestamp.fromDate(new Date('2025-05-01T00:00:00Z')),
        description: 'Neue Jacke',
        type: 'expense',
        userId: 'x9MAIprT1lhWOytiDNyG0rmC4Kp2',
    },
    {
        amount: 1500.00,
        category: 'Freelance Income',
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2025-05-02T11:00:00Z')),
        date: admin.firestore.Timestamp.fromDate(new Date('2025-05-02T00:00:00Z')),
        description: 'Projektzahlung',
        type: 'income',
        userId: 'x9MAIprT1lhWOytiDNyG0rmC4Kp2',
    },
    {
        amount: 15.99,
        category: 'Movies & Shows',
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2025-05-03T20:00:00Z')),
        date: admin.firestore.Timestamp.fromDate(new Date('2025-05-03T00:00:00Z')),
        description: 'Netflix Abonnement',
        type: 'expense',
        userId: 'x9MAIprT1lhWOytiDNyG0rmC4Kp2',
    },
    {
        amount: 80.00,
        category: 'Medical Expenses',
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2025-05-04T09:30:00Z')),
        date: admin.firestore.Timestamp.fromDate(new Date('2025-05-04T00:00:00Z')),
        description: 'Arztbesuch',
        type: 'expense',
        userId: 'x9MAIprT1lhWOytiDNyG0rmC4Kp2',
    },
];

const budgets = [
    // User 1: sRP7Ln2ohyVOh5QyT1LIOQIFwey1 (test@fh.de)
    {
        category: 'Groceries',
        limit: 200.00,
        userId: 'sRP7Ln2ohyVOh5QyT1LIOQIFwey1',
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2025-05-01T08:00:00Z')),
        updatedAt: admin.firestore.Timestamp.fromDate(new Date('2025-05-01T08:00:00Z')),
        startDate: admin.firestore.Timestamp.fromDate(new Date('2025-05-01T00:00:00Z')),
        period: 'monthly',
    },
    {
        category: 'Dining Out',
        limit: 100.00,
        userId: 'sRP7Ln2ohyVOh5QyT1LIOQIFwey1',
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2025-05-01T08:00:00Z')),
        updatedAt: admin.firestore.Timestamp.fromDate(new Date('2025-05-01T08:00:00Z')),
        startDate: admin.firestore.Timestamp.fromDate(new Date('2025-05-01T00:00:00Z')),
        period: 'monthly',
    },
    {
        category: 'Fuel',
        limit: 150.00,
        userId: 'sRP7Ln2ohyVOh5QyT1LIOQIFwey1',
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2025-05-01T08:00:00Z')),
        updatedAt: admin.firestore.Timestamp.fromDate(new Date('2025-05-01T08:00:00Z')),
        startDate: admin.firestore.Timestamp.fromDate(new Date('2025-05-01T00:00:00Z')),
        period: 'monthly',
    },
    // User 2: x9MAIprT1lhWOytiDNyG0rmC4Kp2 (admin@fh.de)
    {
        category: 'Clothing',
        limit: 300.00,
        userId: 'x9MAIprT1lhWOytiDNyG0rmC4Kp2',
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2025-05-01T08:00:00Z')),
        updatedAt: admin.firestore.Timestamp.fromDate(new Date('2025-05-01T08:00:00Z')),
        startDate: admin.firestore.Timestamp.fromDate(new Date('2025-05-01T00:00:00Z')),
        period: 'monthly',
    },
    {
        category: 'Movies & Shows',
        limit: 50.00,
        userId: 'x9MAIprT1lhWOytiDNyG0rmC4Kp2',
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2025-05-01T08:00:00Z')),
        updatedAt: admin.firestore.Timestamp.fromDate(new Date('2025-05-01T08:00:00Z')),
        startDate: admin.firestore.Timestamp.fromDate(new Date('2025-05-01T00:00:00Z')),
        period: 'monthly',
    },
    {
        category: 'Medical Expenses',
        limit: 200.00,
        userId: 'x9MAIprT1lhWOytiDNyG0rmC4Kp2',
        createdAt: admin.firestore.Timestamp.fromDate(new Date('2025-05-01T08:00:00Z')),
        updatedAt: admin.firestore.Timestamp.fromDate(new Date('2025-05-01T08:00:00Z')),
        startDate: admin.firestore.Timestamp.fromDate(new Date('2025-05-01T00:00:00Z')),
        period: 'monthly',
    },
];

async function seedFirestore() {
    try {
        // Insert transactions
        for (const txn of transactions) {
            const docRef = await db.collection('transactions').add(txn);
            logger.info(`Added transaction with ID: ${docRef.id}`);
        }

        // Insert budgets
        for (const budget of budgets) {
            const docRef = await db.collection('budgets').add(budget);
            logger.info(`Added budget with ID: ${docRef.id}`);
        }

        logger.info('Firestore seeding completed');
        process.exit(0);
    } catch (error) {
        logger.error('Error seeding Firestore:', error);
        process.exit(1);
    }
}

seedFirestore();