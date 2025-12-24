
import { createClient } from '@supabase/supabase-js';

// Safely access environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Please check your environment variables.');
}

// Fallback to placeholder to prevent "supabaseUrl is required" error on initialization.
// This allows the app to load, though backend features will fail until configured correctly.
const url = supabaseUrl && supabaseUrl.trim() !== '' ? supabaseUrl : 'https://placeholder.supabase.co';
const key = supabaseAnonKey && supabaseAnonKey.trim() !== '' ? supabaseAnonKey : 'placeholder';

export const supabase = createClient(url, key);
