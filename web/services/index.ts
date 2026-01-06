/**
 * Barrel exports for all services
 * Enables cleaner imports: import { getTasks, getBudget } from './services';
 */

export * from './taskService';
export * from './budgetService';
export * from './notificationService';
export * from './partnerService';
export * from './routineService';
export * from './geminiService';
export * from './notesService';
export * from './dayPlanService';
export * from './googleCalendarService';
export { supabase, getProviderToken, signInWithGoogleCalendar } from './supabaseClient';
