
import { Budget, Transaction, RecurringTransaction } from "../types";
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
        transactions: (transactions || []).map((t: any) => ({
            id: t.id,
            description: t.description,
            amount: t.amount,
            type: t.type,
            date: parseInt(t.date) // Ensure number
        })),
        recurring: (recurring || []).map((r: any) => ({
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
            date: Date.now()
        });
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
