/**
 * Centralized application constants
 * Single source of truth for limits, timeouts, and configuration
 */

// API Configuration
export const API_CONFIG = {
  TIMEOUT: 30000, // 30 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
} as const;

// File Upload Limits
export const FILE_LIMITS = {
  MAX_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_TYPES: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
  MAX_DIMENSION: 4096, // Max width/height in pixels
} as const;

// Input Validation Limits
export const INPUT_LIMITS = {
  TITLE_MAX: 500,
  DESCRIPTION_MAX: 5000,
  MESSAGE_MAX: 10000,
  TAG_MAX: 50,
  LOCATION_MAX: 200,
} as const;

// Budget Limits
export const BUDGET_LIMITS = {
  MIN_AMOUNT: 0,
  MAX_AMOUNT: 1000000000, // 1 billion
  MIN_LIMIT: 0,
  MAX_LIMIT: 1000000000,
} as const;

// Date Limits
export const DATE_LIMITS = {
  MIN_YEAR: 1900,
  MAX_YEAR: 2100,
} as const;

// Rate Limiting (client-side throttling)
export const RATE_LIMITS = {
  AI_CHAT_DELAY: 1000, // 1 second between requests
  SEARCH_DEBOUNCE: 300, // 300ms debounce for search
  AUTO_SAVE_DELAY: 2000, // 2 seconds for auto-save
} as const;

// Cache Configuration
export const CACHE_CONFIG = {
  TASKS_STALE_TIME: 5 * 60 * 1000, // 5 minutes
  BUDGET_STALE_TIME: 5 * 60 * 1000, // 5 minutes
  SETTINGS_STALE_TIME: 10 * 60 * 1000, // 10 minutes
  PARTNERS_STALE_TIME: 10 * 60 * 1000, // 10 minutes
} as const;

// Notification Configuration
export const NOTIFICATION_CONFIG = {
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 5000, // 5 seconds
  PERMISSION_TIMEOUT: 10000, // 10 seconds
} as const;

// UI Configuration
export const UI_CONFIG = {
  TOAST_DURATION: 5000, // 5 seconds
  MODAL_ANIMATION_DURATION: 300, // 300ms
  DEBOUNCE_DELAY: 300, // 300ms
  THROTTLE_DELAY: 1000, // 1 second
} as const;

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  FILE_TOO_LARGE: `File size exceeds ${FILE_LIMITS.MAX_SIZE / (1024 * 1024)}MB limit.`,
  INVALID_FILE_TYPE: 'Invalid file type. Please upload an image file.',
  GENERIC_ERROR: 'Something went wrong. Please try again.',
} as const;

// Success Messages
export const SUCCESS_MESSAGES = {
  TASK_CREATED: 'Task created successfully',
  TASK_UPDATED: 'Task updated successfully',
  TASK_DELETED: 'Task deleted successfully',
  BUDGET_UPDATED: 'Budget updated successfully',
  SETTINGS_SAVED: 'Settings saved successfully',
  PARTNER_ADDED: 'Partner added successfully',
} as const;

// Local Storage Keys
export const STORAGE_KEYS = {
  THEME: 'chronodex_theme',
  NOTIFICATION_SETTINGS: 'chronodex_notification_settings',
  PUSH_SUBSCRIPTION: 'chronodex_push_subscription',
  LAST_SYNC: 'chronodex_last_sync',
} as const;

// Feature Flags
export const FEATURES = {
  AI_CHAT_ENABLED: true,
  PUSH_NOTIFICATIONS_ENABLED: true,
  COLLABORATION_ENABLED: true,
  ROUTINES_ENABLED: true,
  ANALYTICS_ENABLED: false, // Disabled by default for privacy
} as const;
