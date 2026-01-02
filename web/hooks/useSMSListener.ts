import { useState, useEffect } from 'react';
import * as SmsService from '../services/smsService';
import { useBudget } from './useBudget';

export const useSMSListener = () => {
    const [lastSmsTransaction, setLastSmsTransaction] = useState<SmsService.ParsedSMS | null>(null);
    const { refetch: refetchBudget } = useBudget();

    useEffect(() => {
        const handleSmsEvent = async (event: CustomEvent) => {
            const { body, sender } = event.detail;
            if (body) {
                // Use processAndSaveSMS to ensure it goes to DB
                const parsed = await SmsService.processAndSaveSMS(body, sender || 'Unknown');
                if (parsed) {
                    // Refresh budget to show new item
                    refetchBudget();

                    setLastSmsTransaction(parsed);
                    setTimeout(() => setLastSmsTransaction(null), 5000);
                }
            }
        };
        
        window.addEventListener('sms_received', handleSmsEvent as EventListener);
        return () => {
            window.removeEventListener('sms_received', handleSmsEvent as EventListener);
        };
    }, [refetchBudget]);

    return { lastSmsTransaction, setLastSmsTransaction };
};
