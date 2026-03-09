/**
 * Production-safe logging utility
 * Conditionally logs based on environment and provides structured logging
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

/**
 * Redact sensitive information from log messages
 */
function redactSensitiveData(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const sensitiveKeys = ['password', 'token', 'apiKey', 'api_key', 'secret', 'authorization'];
  const redacted = { ...data };

  for (const key in redacted) {
    if (sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive))) {
      redacted[key] = '[REDACTED]';
    } else if (typeof redacted[key] === 'object') {
      redacted[key] = redactSensitiveData(redacted[key]);
    }
  }

  return redacted;
}

/**
 * Format log message with timestamp and context
 */
function formatLogMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` | ${JSON.stringify(redactSensitiveData(context))}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
}

/**
 * Logger class for production-safe logging
 */
/**
 * Logger class for production-safe logging
 */
class Logger {
  private isDevelopment: boolean;
  private readonly MAX_LOGS = 200;
  private readonly STORAGE_KEY = 'debug_logs';

  constructor() {
    this.isDevelopment = import.meta.env.DEV;
  }

  private saveLog(level: LogLevel, message: string, context?: LogContext, error?: Error): void {
    try {
      const timestamp = new Date().toISOString();
      const logEntry = {
        timestamp,
        level,
        message,
        context: context ? redactSensitiveData(context) : undefined,
        error: error
          ? {
              message: error.message,
              stack: error.stack,
              name: error.name,
            }
          : undefined,
      };

      const existingLogs = this.getLogs();
      const newLogs = [logEntry, ...existingLogs].slice(0, this.MAX_LOGS);

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(newLogs));
    } catch (e) {
      // Fallback if localStorage fails (e.g. quota exceeded)
      console.warn('Failed to save log to localStorage', e);
    }
  }

  getLogs(): any[] {
    try {
      const logs = localStorage.getItem(this.STORAGE_KEY);
      return logs ? JSON.parse(logs) : [];
    } catch {
      return [];
    }
  }

  clearLogs(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Debug logging (only in development)
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.debug(formatLogMessage('debug', message, context));
    }
    // Always save debug logs for inspection in the debug view
    this.saveLog('debug', message, context);
  }

  /**
   * Info logging (only in development)
   */
  info(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.info(formatLogMessage('info', message, context));
    }
    this.saveLog('info', message, context);
  }

  /**
   * Warning logging (always logged)
   */
  warn(message: string, context?: LogContext): void {
    console.warn(formatLogMessage('warn', message, context));
    this.saveLog('warn', message, context);

    // In production, you could send to error tracking service
    if (!this.isDevelopment) {
      this.sendToErrorTracking('warn', message, context);
    }
  }

  /**
   * Error logging (always logged)
   */
  error(message: string, error?: Error, context?: LogContext): void {
    const errorContext = {
      ...context,
      errorMessage: error?.message,
      errorStack: this.isDevelopment ? error?.stack : undefined,
    };

    console.error(formatLogMessage('error', message, errorContext));
    this.saveLog('error', message, context, error);

    // In production, send to error tracking service
    if (!this.isDevelopment) {
      this.sendToErrorTracking('error', message, errorContext, error);
    }
  }

  /**
   * Send logs to error tracking service (placeholder for integration)
   */
  private sendToErrorTracking(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error
  ): void {
    // TODO: Integrate with error tracking service (e.g., Sentry)
    // Example:
    // Sentry.captureException(error || new Error(message), {
    //   level: level === 'warn' ? 'warning' : level,
    //   extra: context,
    // });
  }

  /**
   * Performance timing utility
   */
  time(label: string): void {
    if (this.isDevelopment) {
      console.time(label);
    }
  }

  /**
   * End performance timing
   */
  timeEnd(label: string): void {
    if (this.isDevelopment) {
      console.timeEnd(label);
    }
  }

  /**
   * Group logs (development only)
   */
  group(label: string): void {
    if (this.isDevelopment) {
      console.group(label);
    }
  }

  /**
   * End log group
   */
  groupEnd(): void {
    if (this.isDevelopment) {
      console.groupEnd();
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Export for testing
export { Logger };
