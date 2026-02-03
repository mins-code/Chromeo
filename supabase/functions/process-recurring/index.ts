import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 🛡️ SECURITY: Restrict CORS to the application domain
const ALLOWED_ORIGIN = Deno.env.get("APP_URL") || "https://chronodex.vercel.app";

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
};

// 🛡️ SECURITY: Timing-safe comparison using SHA-256
const secureCompare = async (a: string, b: string): Promise<boolean> => {
  const encoder = new TextEncoder();
  const aBuf = encoder.encode(a);
  const bBuf = encoder.encode(b);

  const key = await crypto.subtle.digest("SHA-256", aBuf);
  const lock = await crypto.subtle.digest("SHA-256", bBuf);

  const keyArr = new Uint8Array(key);
  const lockArr = new Uint8Array(lock);

  // Use constant-time comparison loop
  let mismatch = 0;
  for (let i = 0; i < keyArr.length; i++) {
    mismatch |= keyArr[i] ^ lockArr[i];
  }

  return mismatch === 0;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Security Check: Ensure the request is authorized
    const authHeader = req.headers.get('Authorization');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // 🛡️ SECURITY: Fail securely if key is missing in environment
    if (!serviceRoleKey) {
        console.error("INTERNAL SECURITY ERROR: SUPABASE_SERVICE_ROLE_KEY is missing");
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const expectedHeader = `Bearer ${serviceRoleKey}`;
    let authorized = false;

    // 🛡️ SECURITY: Strictly verify the Service Role Key using timing-safe comparison
    if (authHeader) {
        authorized = await secureCompare(authHeader, expectedHeader);
    }

    if (!authorized) {
        console.log("Unauthorized request - invalid service role key");
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey // Use the confirmed key
    );

    const now = new Date();
    const results = { transactions: [] as string[], tasks: [] as string[] };

    // --- 1. Process Recurring Transactions ---
    const { data: recurringTx, error: txError } = await supabaseClient
        .from('transactions')
        .select('*')
        .not('next_due_date', 'is', null)
        .lte('next_due_date', now.toISOString())
        // 🛡️ SECURITY: Limit batch size to prevent DoS/timeout, order by due date for fairness
        .order('next_due_date', { ascending: true })
        .limit(50);

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
        .lte('next_recurrence_date', now.toISOString())
        // 🛡️ SECURITY: Limit batch size to prevent DoS/timeout, order by due date for fairness
        .order('next_recurrence_date', { ascending: true })
        .limit(50);

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
    console.error('Error processing recurring items:', error);
    // 🛡️ SECURITY: Return generic error message
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
