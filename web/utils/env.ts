/**
 * Environment variable validation
 * 
 * Ensures all required environment variables are present at startup.
 * Provides type-safe access to environment configuration.
 */

/**
 * Required environment variables for the application
 */
const REQUIRED_ENV_VARS = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
] as const;

/**
 * Optional environment variables with defaults
 */
const OPTIONAL_ENV_VARS = [
  'VITE_GEMINI_API_KEY',
] as const;

type RequiredEnvVar = typeof REQUIRED_ENV_VARS[number];
type OptionalEnvVar = typeof OPTIONAL_ENV_VARS[number];

/**
 * Validates that all required environment variables are set.
 * Call this at application startup.
 * 
 * @throws Error if any required environment variables are missing
 */
export function validateEnv(): void {
  const missing: string[] = [];
  
  for (const key of REQUIRED_ENV_VARS) {
    if (!import.meta.env[key]) {
      missing.push(key);
    }
  }
  
  if (missing.length > 0) {
    const message = 
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file and ensure all required variables are set.';
    
    if (import.meta.env.DEV) {
      console.error(`[ENV] ${message}`);
    }
    
    throw new Error(message);
  }
}

/**
 * Get an environment variable value with type safety
 * @param key - Environment variable key
 * @returns The value or undefined if not set
 */
export function getEnv(key: RequiredEnvVar | OptionalEnvVar): string | undefined {
  return import.meta.env[key] as string | undefined;
}

/**
 * Type-safe environment configuration object
 * All required values are guaranteed to be strings (or throws at validation)
 */
export const env = {
  // Required Supabase configuration
  get supabaseUrl(): string {
    const value = import.meta.env.VITE_SUPABASE_URL;
    if (!value) throw new Error('VITE_SUPABASE_URL is required');
    return value;
  },
  
  get supabaseKey(): string {
    const value = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!value) throw new Error('VITE_SUPABASE_ANON_KEY is required');
    return value;
  },
  
  // Optional Gemini API key
  get geminiApiKey(): string | undefined {
    return import.meta.env.VITE_GEMINI_API_KEY;
  },
  
  // Environment flags
  get isProd(): boolean {
    return import.meta.env.PROD;
  },
  
  get isDev(): boolean {
    return import.meta.env.DEV;
  },
  
  get mode(): string {
    return import.meta.env.MODE;
  },
} as const;

/**
 * Check if we're running in a browser environment
 */
export const isBrowser = typeof window !== 'undefined';

/**
 * Check if we're running on a mobile device (basic detection)
 */
export const isMobile = isBrowser && /Mobi|Android/i.test(navigator.userAgent);

/**
 * Check if we're running as a PWA
 */
export const isPWA = isBrowser && window.matchMedia('(display-mode: standalone)').matches;
