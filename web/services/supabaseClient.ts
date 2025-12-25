import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Strict validation - fail fast in development
if (!supabaseUrl || !supabaseAnonKey || supabaseUrl.trim() === '' || supabaseAnonKey.trim() === '') {
  const errorMsg = '❌ Supabase credentials missing! Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY';
  console.error(errorMsg);
  
  // In production (Vercel), this will be caught by Vercel's error tracking
  if (import.meta.env.PROD) {
    throw new Error('Supabase configuration error - check environment variables');
  }
  
  // In development, use placeholders to prevent crash (but log warning)
  console.warn('⚠️ Using placeholder Supabase credentials - app will not function properly');
}

const url = supabaseUrl && supabaseUrl.trim() !== '' ? supabaseUrl : 'https://placeholder.supabase.co';
const key = supabaseAnonKey && supabaseAnonKey.trim() !== '' ? supabaseAnonKey : 'placeholder';

export const supabase = createClient(url, key);
