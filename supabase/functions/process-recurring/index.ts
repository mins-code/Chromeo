
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date();
    const results = { transactions: [] as string[], tasks: [] as string[] };

    // --- 1. Process Recurring Transactions ---
    const { data: recurringTx, error: txError } = await supabaseClient
        .from('transactions')
        .select('*')
        .not('next_due_date', 'is', null)
        .lte('next_due_date', now.toISOString());

    if (txError) throw txError;

    for (const item of recurringTx) {
        // Create the new transaction instance
        const { error: insertError } = await supabaseClient
            .from('transactions')
            .insert({
                user_id: item.user_id,
                description: `${item.description} (Recurring)`,
                amount: item.amount,
                type: item.type,
                date: now.toISOString(),
                frequency: null,
                next_due_date: null
            });

        if (insertError) {
            console.error(`Failed to process transaction ${item.id}`, insertError);
            continue;
        }

        // Calculate next date for transaction
        const nextDate = new Date(item.next_due_date);
        switch (item.frequency) {
            case 'daily': nextDate.setDate(nextDate.getDate() + 1); break;
            case 'weekly': nextDate.setDate(nextDate.getDate() + 7); break;
            case 'monthly': nextDate.setMonth(nextDate.getMonth() + 1); break;
            case 'yearly': nextDate.setFullYear(nextDate.getFullYear() + 1); break;
        }

        // Update the template
        await supabaseClient
            .from('transactions')
            .update({ next_due_date: nextDate.toISOString() })
            .eq('id', item.id);

        results.transactions.push(item.id);
    }

    // --- 2. Process Recurring Tasks ---
    // recurrence jsonb expected format: { frequency: 'daily' | 'weekly' | ..., interval: number }
    const { data: recurringTasks, error: taskError } = await supabaseClient
        .from('tasks')
        .select('*')
        .not('next_recurrence_date', 'is', null)
        .lte('next_recurrence_date', now.toISOString());

    if (taskError) throw taskError;

    for (const task of recurringTasks) {
        // Create new task instance
        // We copy the task but remove the recurrence settings from the instance (it's a one-off)
        // and set the due_date to the scheduled date.
        const { error: insertError } = await supabaseClient
            .from('tasks')
            .insert({
                user_id: task.user_id,
                title: task.title,
                description: task.description,
                status: 'TODO',
                priority: task.priority,
                due_date: task.next_recurrence_date, // The instance is due on the recurrence date
                reminder_time: task.reminder_time, // Optionally offset this too, but keeping simple for now
                subtasks: task.subtasks, // Clone subtasks (reset to false is handled by default json if structure allows, but here we just copy)
                tags: task.tags,
                type: task.type,
                duration: task.duration,
                location: task.location,
                dependency_ids: [], // Usually reset dependencies for new instance
                is_shared: task.is_shared,
                recurrence: null // Instance is not recurring
            });

        if (insertError) {
             console.error(`Failed to process task ${task.id}`, insertError);
             continue;
        }

        // Calculate next date for task
        // Parse JSONB recurrence
        const config = task.recurrence;
        if (!config || !config.frequency) continue;

        const nextDate = new Date(task.next_recurrence_date);
        const interval = config.interval || 1;

        switch (config.frequency) {
            case 'daily': nextDate.setDate(nextDate.getDate() + (1 * interval)); break;
            case 'weekly': nextDate.setDate(nextDate.getDate() + (7 * interval)); break;
            case 'monthly': nextDate.setMonth(nextDate.getMonth() + (1 * interval)); break;
            case 'yearly': nextDate.setFullYear(nextDate.getFullYear() + (1 * interval)); break;
        }

        // Update the template
        await supabaseClient
            .from('tasks')
            .update({ next_recurrence_date: nextDate.toISOString() })
            .eq('id', task.id);

        results.tasks.push(task.id);
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
