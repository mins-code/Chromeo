import { useState, useEffect, useRef } from 'react';
import { RecurringTransaction } from '../types';
import { useBudget } from './useBudget';
import { logger } from '../utils/logger';

export const useRecurringProcessor = () => {
    const { budget, processRecurring } = useBudget();
    const [dueRecurringItems, setDueRecurringItems] = useState<RecurringTransaction[]>([]);
    const [showRecurringModal, setShowRecurringModal] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
    const hasAutoProcessed = useRef<Set<string>>(new Set());

    // Check for due recurring items when budget loads
    // Auto-process items that are significantly past due (more than 1 day old)
    // Show modal for items due today or within the last day
    useEffect(() => {
        const processOverdueItems = async () => {
            if (budget.recurring.length === 0) return;

            const now = new Date();
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            
            const allDue = budget.recurring.filter(r => new Date(r.nextDueDate) <= now);
            
            if (allDue.length === 0) return;

            // Separate into auto-process (old) and manual (recent)
            const overdueItems: RecurringTransaction[] = [];
            const recentDueItems: RecurringTransaction[] = [];
            
            for (const item of allDue) {
                const dueDate = new Date(item.nextDueDate);
                if (dueDate < oneDayAgo && !hasAutoProcessed.current.has(item.id)) {
                    overdueItems.push(item);
                } else if (!hasAutoProcessed.current.has(item.id)) {
                    recentDueItems.push(item);
                }
            }

            // Auto-process significantly overdue items silently
            if (overdueItems.length > 0) {
                logger.debug(`[RecurringProcessor] Auto-processing ${overdueItems.length} overdue items`);
                for (const item of overdueItems) {
                    try {
                        hasAutoProcessed.current.add(item.id);
                        await processRecurring(item.id);
                        logger.debug(`[RecurringProcessor] Auto-processed: ${item.description}`);
                    } catch (error) {
                        logger.error(`[RecurringProcessor] Failed to auto-process ${item.description}`, error as Error);
                        hasAutoProcessed.current.delete(item.id);
                    }
                }
            }

            // Show modal for recently due items (require user confirmation)
            if (recentDueItems.length > 0) {
                setDueRecurringItems(recentDueItems);
                setShowRecurringModal(true);
            }
        };

        processOverdueItems();
    }, [budget.recurring, processRecurring]);

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
