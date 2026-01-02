import { useState, useEffect } from 'react';
import { RecurringTransaction } from '../types';
import { useBudget } from './useBudget';

export const useRecurringProcessor = () => {
    const { budget, processRecurring } = useBudget();
    const [dueRecurringItems, setDueRecurringItems] = useState<RecurringTransaction[]>([]);
    const [showRecurringModal, setShowRecurringModal] = useState(false);

    // Check for due recurring items when budget loads
    useEffect(() => {
        if (budget.recurring.length > 0) {
            const now = new Date();
            const due = budget.recurring.filter(r => new Date(r.nextDueDate) <= now);
            if (due.length > 0) {
                setDueRecurringItems(due);
                setShowRecurringModal(true);
            }
        }
    }, [budget.recurring]);

    const handleProcessRecurring = async (id: string) => {
        await processRecurring(id);
        setDueRecurringItems(prev => prev.filter(item => item.id !== id));
        if (dueRecurringItems.length <= 1) {
            setShowRecurringModal(false);
        }
    };

    const handleDismissRecurring = () => {
        setShowRecurringModal(false);
    };

    return {
        dueRecurringItems,
        showRecurringModal,
        handleProcessRecurring,
        handleDismissRecurring
    };
};
