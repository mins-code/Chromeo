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

/**
 * Retrieve the OAuth provider token (e.g., Google access token) from the current session.
 * Note: Supabase only exposes provider_token immediately after OAuth sign-in.
 * If the token is missing, the user may need to re-authenticate with the OAuth provider.
 * 
 * @returns The provider access token, or null if not available
 */
export async function getProviderToken(): Promise<string | null> {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session for provider token:', error.message);
      return null;
    }
    
    return session?.provider_token || null;
  } catch (err) {
    console.error('Error retrieving provider token:', err);
    return null;
  }
}

/**
 * Trigger Google OAuth sign-in with required scopes for Calendar access.
 * Call this when Google Calendar sync is enabled but no token is available.
 */
export async function signInWithGoogleCalendar(): Promise<void> {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      scopes: 'https://www.googleapis.com/auth/calendar.events.readonly',
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
      redirectTo: window.location.origin,
    },
  });
}
