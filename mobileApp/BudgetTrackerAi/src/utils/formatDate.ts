// BudgetTrackerAi/utils/formatDate.ts
import { Timestamp } from 'firebase/firestore';

export const formatDate = (date: Date | Timestamp | string): string => {
    let dateObj: Date;

    if (typeof date === 'string') {
        dateObj = new Date(date);
    } else if (date instanceof Timestamp) {
        dateObj = date.toDate();
    } else {
        dateObj = date;
    }

    if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) {
        console.warn('Invalid date provided to formatDate:', date);
        return 'Invalid Date';
    }

    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(dateObj).split('/').join('-');
};