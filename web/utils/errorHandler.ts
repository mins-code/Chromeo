/**
 * Centralized error handling utilities for service layer
 * Provides consistent error handling patterns across the application
 */

/**
 * Custom application error class with additional context
 */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';

    // Maintains proper stack trace for where error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError);
    }
  }

  /**
   * Create an AppError from an unknown error
   */
  static from(error: unknown, context?: string): AppError {
    if (error instanceof AppError) {
      return error;
    }

    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return new AppError(message, 'UNKNOWN_ERROR', undefined, { originalError: error, context });
  }

  /**
   * Check if this is a network-related error
   */
  isNetworkError(): boolean {
    return (
      this.code === 'NETWORK_ERROR' ||
      this.message.toLowerCase().includes('network') ||
      this.message.toLowerCase().includes('fetch')
    );
  }

  /**
   * Check if this is an authentication error
   */
  isAuthError(): boolean {
    return this.code === 'AUTH_ERROR' || this.statusCode === 401 || this.statusCode === 403;
  }
}

/**
 * Handle service layer errors with consistent logging and re-throwing
 * @param error - The caught error
 * @param context - Context string for logging (e.g., function name)
 * @throws AppError - Always throws an AppError
 */
export function handleServiceError(error: unknown, context: string): never {
  if (error instanceof AppError) {
    console.error(`[${context}]`, error.message, error.context);
    throw error;
  }

  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(`[${context}] Error:`, error);

  throw new AppError(message, 'SERVICE_ERROR', undefined, { context });
}

/**
 * Check if an error is a network-related error
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.isNetworkError();
  }

  return (
    error instanceof Error &&
    (error.message.toLowerCase().includes('network') ||
      error.message.toLowerCase().includes('fetch') ||
      error.message.toLowerCase().includes('failed to fetch'))
  );
}

/**
 * Check if an error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.isAuthError();
  }

  return (
    error instanceof Error &&
    (error.message.toLowerCase().includes('unauthorized') ||
      error.message.toLowerCase().includes('unauthenticated'))
  );
}

/**
 * Safely execute an async operation with error handling
 * @param operation - The async operation to execute
 * @param context - Context string for error logging
 * @param fallback - Optional fallback value on error
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  context: string,
  fallback?: T
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.error(`[${context}] Error:`, error);

    if (fallback !== undefined) {
      return fallback;
    }

    throw AppError.from(error, context);
  }
}

/**
 * Type guard for checking if value is an Error
 */
export function isError(value: unknown): value is Error {
  return value instanceof Error;
}
