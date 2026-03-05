
import { Budget, Transaction, RecurringTransaction, DbTransaction, DbUserSettings, DbBudgetShare } from "../types";
import { supabase } from "./supabaseClient";
import { logger } from "../utils/logger";

// Helper to construct a Budget object from disparate DB tables
export const getBudget = async (): Promise<Budget> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { limit: 0, duration: 'Monthly', transactions: [], recurring: [], savings: 0 };

    // 1. Fetch User Settings
    let { data: settings } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

    if (!settings) {
        // Create default settings if not exist
        const { data: newSettings } = await supabase
            .from('user_settings')
            .insert({ user_id: user.id, budget_limit: 0, budget_duration: 'Monthly' })
            .select()
            .single();
        settings = newSettings;
    }

    // 2. Fetch Transactions
    const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .is('next_due_date', null) // Only non-recurring logs
        .order('date', { ascending: false });

    // 3. Fetch Recurring Templates
    const { data: recurring } = await supabase
        .from('transactions')
        .select('*')
        .not('next_due_date', 'is', null);

    return {
        limit: settings?.budget_limit || 0,
        duration: settings?.budget_duration || 'Monthly',
        savings: settings?.savings || 0,
        transactions: (transactions || []).map((t: DbTransaction) => ({
            id: t.id,
            description: t.description,
            amount: t.amount,
            type: t.type,
            date: Date.parse(t.date),
            category: t.category || 'Uncategorized'
        })),
        recurring: (recurring || []).map((r: DbTransaction) => ({
            id: r.id,
            description: r.description,
            amount: r.amount,
            type: r.type,
            frequency: r.frequency,
            nextDueDate: r.next_due_date
        }))
    };
};

export const updateBudgetSettings = async (limit: number, duration: string): Promise<Budget> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        await supabase
            .from('user_settings')
            .upsert({ user_id: user.id, budget_limit: limit, budget_duration: duration });
    }
    return getBudget();
};

export const addTransaction = async (description: string, amount: number, type: 'income' | 'expense', category?: string): Promise<Budget> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        await supabase.from('transactions').insert({
            user_id: user.id,
            description,
            amount,
            type,
            date: new Date().toISOString(),
            category: category || 'Uncategorized'
        });
    }
    return getBudget();
};

export const updateTransaction = async (id: string, description: string, amount: number, type: 'income' | 'expense', category?: string): Promise<Budget> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const updateData: any = { description, amount, type };
        if (category !== undefined) {
            updateData.category = category;
        }
        await supabase
            .from('transactions')
            .update(updateData)
            .eq('id', id)
            .eq('user_id', user.id); // Security: only update own transactions
    }
    return getBudget();
};

export const deleteTransaction = async (id: string): Promise<Budget> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        await supabase
            .from('transactions')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id); // Security: only delete own transactions
    }
    return getBudget();
};

// Recurring Logic

export const processRecurringTransaction = async (recurringId: string): Promise<Budget> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return getBudget();

    const { data: item } = await supabase.from('transactions').select('*').eq('id', recurringId).single();

    if (item) {
        // 1. Insert the realized transaction
        await supabase.from('transactions').insert({
            user_id: user.id,
            description: `${item.description} (Recurring)`,
            amount: item.amount,
            type: item.type,
            date: Date.now()
        });

        // 2. Calculate next due date
        const nextDate = new Date(item.next_due_date);
        switch (item.frequency) {
            case 'daily': nextDate.setDate(nextDate.getDate() + 1); break;
            case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break;
            case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
            case 'yearly': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
        }

        // 3. Update the recurring template
        await supabase.from('transactions').update({ next_due_date: nextDate.toISOString() }).eq('id', recurringId);
    }
    
    return getBudget();
};

export const updateRecurringTransaction = async (
    id: string,
    updates: {
        description?: string;
        amount?: number;
        type?: 'income' | 'expense';
        frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
        nextDueDate?: string;
    }
): Promise<Budget> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const updateData: Record<string, unknown> = {};
        if (updates.description !== undefined) updateData.description = updates.description;
        if (updates.amount !== undefined) updateData.amount = updates.amount;
        if (updates.type !== undefined) updateData.type = updates.type;
        if (updates.frequency !== undefined) updateData.frequency = updates.frequency;
        if (updates.nextDueDate !== undefined) updateData.next_due_date = updates.nextDueDate;

        await supabase
            .from('transactions')
            .update(updateData)
            .eq('id', id)
            .eq('user_id', user.id)
            .not('next_due_date', 'is', null); // Only update recurring templates
    }
    return getBudget();
};

export const deleteRecurringTransaction = async (id: string): Promise<Budget> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        await supabase
            .from('transactions')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id)
            .not('next_due_date', 'is', null); // Only delete recurring templates
    }
    return getBudget();
};

export const addRecurringTransaction = async (
    description: string,
    amount: number,
    type: 'income' | 'expense',
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly',
    startDate: string // ISO Date string for when the recurring logic should start
): Promise<Budget> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        const start = new Date(startDate);
        const today = new Date();
        // Reset time parts for date comparison
        const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate());
        const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());

        // Condition 1: Start Date is Today (or in past) -> behave like legacy
        if (startDay <= todayDay) {
            // 1. Insert the Immediate Realized Transaction
            await supabase.from('transactions').insert({
                user_id: user.id,
                description: `${description} (Recurring)`,
                amount,
                type,
                date: new Date().toISOString(),
                frequency: null,
                next_due_date: null
            });

            // 2. Insert the Recurring Rule (next run is in future)
            const nextDueDate = new Date(); // Start from today for calculation
            switch (frequency) {
                case 'daily': nextDueDate.setDate(nextDueDate.getDate() + 1); break;
                case 'weekly': nextDueDate.setDate(nextDueDate.getDate() + 7); break;
                case 'monthly': nextDueDate.setMonth(nextDueDate.getMonth() + 1); break;
                case 'yearly': nextDueDate.setFullYear(nextDueDate.getFullYear() + 1); break;
            }

            await supabase.from('transactions').insert({
                user_id: user.id,
                description: description,
                amount,
                type,
                date: new Date().toISOString(),
                frequency,
                next_due_date: nextDueDate.toISOString()
            });
        }
        else {
            // Condition 2: Start Date is in Future -> Schedule only loop
            // Do NOT insert immediate transaction.
            // Insert Recurring Rule with next_due_date = startDate
            await supabase.from('transactions').insert({
                user_id: user.id,
                description: description,
                amount,
                type,
                date: new Date().toISOString(),
                frequency,
                next_due_date: start.toISOString() // First run is on the selected start date
            });
        }
    }
    return getBudget();
};

// ============ BUDGET SHARING ============

import type { BudgetShare, SharedBudgetInfo } from '../types';

export const getBudgetShares = async (): Promise<BudgetShare[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('budget_shares')
        .select(`
            id,
            partner_id,
            created_at,
            partner:profiles!budget_shares_partner_id_fkey(id, email, full_name)
        `)
        .eq('owner_id', user.id);

    if (error) {
        logger.error('Error fetching budget shares', error);
        return [];
    }

    return (data || []).map((s: DbBudgetShare) => {
        // Supabase joins can return single object or array - normalize it
        const partner = Array.isArray(s.partner) ? s.partner[0] : s.partner;
        return {
            id: s.id,
            partnerId: s.partner_id,
            partnerEmail: partner?.email || '',
            partnerName: partner?.full_name || undefined,
            createdAt: s.created_at
        };
    });
};

export const shareBudgetWithPartner = async (partnerId: string): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    // Check if already shared
    const { data: existing } = await supabase
        .from('budget_shares')
        .select('id')
        .eq('owner_id', user.id)
        .eq('partner_id', partnerId)
        .single();

    if (existing) {
        logger.warn('Budget already shared with this partner');
        return true; // Already shared, consider it success
    }

    const { error } = await supabase
        .from('budget_shares')
        .insert({
            owner_id: user.id,
            partner_id: partnerId
        });

    if (error) {
        logger.error('Error sharing budget', error);
        return false;
    }

    return true;
};

export const unshareBudgetWithPartner = async (shareId: string): Promise<boolean> => {
    const { error } = await supabase
        .from('budget_shares')
        .delete()
        .eq('id', shareId);

    if (error) {
        logger.error('Error removing budget share', error);
        return false;
    }

    return true;
};

export const getSharedBudgetFromPartner = async (ownerId: string): Promise<Budget | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // Verify this budget is shared with current user
    const { data: share } = await supabase
        .from('budget_shares')
        .select('id')
        .eq('owner_id', ownerId)
        .eq('partner_id', user.id)
        .single();

    if (!share) {
        logger.warn('Budget not shared with you');
        return null;
    }

    // Fetch the owner's budget settings
    const { data: settings } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', ownerId)
        .single();

    // Fetch the owner's transactions
    const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', ownerId)
        .is('next_due_date', null)
        .order('date', { ascending: false });

    return {
        limit: settings?.budget_limit || 0,
        duration: settings?.budget_duration || 'Monthly',
        savings: settings?.savings || 0,
        transactions: (transactions || []).map((t: DbTransaction) => ({
            id: t.id,
            description: t.description,
            amount: t.amount,
            type: t.type,
            date: Date.parse(t.date)
        })),
        recurring: [] // Don't share recurring details
    };
};

export const getBudgetsSharedWithMe = async (): Promise<SharedBudgetInfo[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
        .from('budget_shares')
        .select(`
            id,
            owner_id,
            created_at,
            owner:profiles!budget_shares_owner_id_fkey(id, email, full_name)
        `)
        .eq('partner_id', user.id);

    if (error) {
        logger.error('Error fetching budgets shared with me', error);
        return [];
    }

    return (data || []).map((s: any) => {
        const owner = Array.isArray(s.owner) ? s.owner[0] : s.owner;
        return {
            ownerId: s.owner_id,
            ownerEmail: owner?.email || '',
            ownerName: owner?.full_name || undefined,
            shareId: s.id,
            createdAt: s.created_at
        };
    });
};
