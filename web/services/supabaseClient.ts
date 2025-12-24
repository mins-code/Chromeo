
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Please check your environment variables.');
}

const url = supabaseUrl && supabaseUrl.trim() !== '' ? supabaseUrl : 'https://placeholder.supabase.co';
const key = supabaseAnonKey && supabaseAnonKey.trim() !== '' ? supabaseAnonKey : 'placeholder';

export const supabase = createClient(url, key);
