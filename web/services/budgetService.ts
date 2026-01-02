
import { Budget, Transaction, RecurringTransaction, DbTransaction, DbUserSettings, DbBudgetShare } from "../types";
import { supabase } from "./supabaseClient";

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
            date: new Date(t.date).getTime()
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

export const addTransaction = async (description: string, amount: number, type: 'income' | 'expense'): Promise<Budget> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        await supabase.from('transactions').insert({
            user_id: user.id,
            description,
            amount,
            type,
            date: new Date().toISOString()
        });
    }
    return getBudget();
};

export const updateTransaction = async (id: string, description: string, amount: number, type: 'income' | 'expense'): Promise<Budget> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        await supabase
            .from('transactions')
            .update({ description, amount, type })
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

// ============ BUDGET SHARING ============

import type { BudgetShare } from '../types';

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
        console.error('Error fetching budget shares:', error);
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
        console.warn('Budget already shared with this partner');
        return true; // Already shared, consider it success
    }

    const { error } = await supabase
        .from('budget_shares')
        .insert({
            owner_id: user.id,
            partner_id: partnerId
        });

    if (error) {
        console.error('Error sharing budget:', error);
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
        console.error('Error removing budget share:', error);
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
        console.warn('Budget not shared with you');
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
            date: new Date(t.date).getTime()
        })),
        recurring: [] // Don't share recurring details
    };
};
