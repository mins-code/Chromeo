import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * Critical: Supabase credentials are REQUIRED.
 * No fallbacks - app must fail immediately if credentials are missing.
 */
if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.trim() === '' || supabaseAnonKey.trim() === '') {
  const errorMsg = `
╔══════════════════════════════════════════════════════════════════╗
║  CRITICAL: Supabase credentials missing!                         ║
║  Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY         ║
║  in your .env file or environment variables.                     ║
╚══════════════════════════════════════════════════════════════════╝
  `;
  console.error(errorMsg);
  throw new Error('Supabase configuration error - VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Verify Supabase connection is functional.
 * Call this from App.tsx before rendering the main router.
 * 
 * @returns Promise<{ success: boolean; error?: string }>
 */
export async function checkSupabaseConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    // Attempt a lightweight health check - getting session is fast and doesn't require auth
    const { error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Supabase connection check failed:', error.message);
      return { success: false, error: error.message };
    }
    
    return { success: true };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown connection error';
    console.error('Supabase connection check failed:', errorMessage);
    return { success: false, error: errorMessage };
  }
}
