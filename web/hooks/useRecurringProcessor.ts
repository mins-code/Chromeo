import { useState, useEffect } from 'react';
import { RecurringTransaction } from '../types';
import { useBudget } from './useBudget';

export const useRecurringProcessor = () => {
    const { budget, processRecurring } = useBudget();
    const [dueRecurringItems, setDueRecurringItems] = useState<RecurringTransaction[]>([]);
    const [showRecurringModal, setShowRecurringModal] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

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

    // Process a single recurring item
    const handleProcessRecurring = async (id: string) => {
        setProcessingIds(prev => new Set(prev).add(id));
        try {
            await processRecurring(id);
            setDueRecurringItems(prev => prev.filter(item => item.id !== id));
            if (dueRecurringItems.length <= 1) {
                setShowRecurringModal(false);
            }
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        }
    };

    // Process all due recurring items at once
    const handleProcessAllRecurring = async () => {
        if (dueRecurringItems.length === 0) return;
        
        setIsProcessing(true);
        const allIds = dueRecurringItems.map(item => item.id);
        setProcessingIds(new Set(allIds));
        
        try {
            // Process all items in parallel
            await Promise.all(dueRecurringItems.map(item => processRecurring(item.id)));
            
            // Clear all items and close modal
            setDueRecurringItems([]);
            setShowRecurringModal(false);
        } catch (error) {
            console.error('Error processing all recurring items:', error);
            // Refresh the list to show what succeeded
            const now = new Date();
            const stillDue = budget.recurring.filter(r => new Date(r.nextDueDate) <= now);
            setDueRecurringItems(stillDue);
        } finally {
            setIsProcessing(false);
            setProcessingIds(new Set());
        }
    };

    const handleDismissRecurring = () => {
        setShowRecurringModal(false);
    };

    return {
        dueRecurringItems,
        showRecurringModal,
        isProcessing,
        processingIds,
        handleProcessRecurring,
        handleProcessAllRecurring,
        handleDismissRecurring
    };
};
