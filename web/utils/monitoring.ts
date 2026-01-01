/**
 * Monitoring and observability utilities
 * Ready for integration with error tracking and analytics services
 */

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
}

interface ErrorEvent {
  message: string;
  stack?: string;
  context?: Record<string, any>;
  timestamp: number;
}

class MonitoringService {
  private metrics: PerformanceMetric[] = [];
  private errors: ErrorEvent[] = [];
  private isProduction: boolean;

  constructor() {
    this.isProduction = import.meta.env.PROD;
    this.initializeMonitoring();
  }

  /**
   * Initialize monitoring and performance tracking
   */
  private initializeMonitoring(): void {
    if (this.isProduction) {
      // Track page load performance
      window.addEventListener('load', () => {
        this.trackPageLoad();
      });

      // Track unhandled errors
      window.addEventListener('error', (event) => {
        this.trackError({
          message: event.message,
          stack: event.error?.stack,
          timestamp: Date.now(),
        });
      });

      // Track unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        this.trackError({
          message: `Unhandled Promise Rejection: ${event.reason}`,
          timestamp: Date.now(),
        });
      });
    }
  }

  /**
   * Track page load performance metrics
   */
  private trackPageLoad(): void {
    if (!window.performance) return;

    const perfData = window.performance.timing;
    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
    const domReadyTime = perfData.domContentLoadedEventEnd - perfData.navigationStart;
    const firstPaintTime = perfData.responseStart - perfData.navigationStart;

    this.trackMetric('page_load_time', pageLoadTime);
    this.trackMetric('dom_ready_time', domReadyTime);
    this.trackMetric('first_paint_time', firstPaintTime);
  }

  /**
   * Track custom performance metric
   */
  trackMetric(name: string, value: number): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
    };

    this.metrics.push(metric);

    // In production, send to analytics service
    if (this.isProduction) {
      this.sendMetricToService(metric);
    }
  }

  /**
   * Track error event
   */
  trackError(error: Omit<ErrorEvent, 'timestamp'> & { timestamp?: number }): void {
    const errorEvent: ErrorEvent = {
      ...error,
      timestamp: error.timestamp || Date.now(),
    };

    this.errors.push(errorEvent);

    // In production, send to error tracking service
    if (this.isProduction) {
      this.sendErrorToService(errorEvent);
    }
  }

  /**
   * Track API call performance
   */
  trackAPICall(endpoint: string, duration: number, success: boolean): void {
    this.trackMetric(`api_${endpoint}_duration`, duration);
    this.trackMetric(`api_${endpoint}_${success ? 'success' : 'error'}`, 1);
  }

  /**
   * Track user interaction
   */
  trackInteraction(action: string, context?: Record<string, any>): void {
    if (!this.isProduction) return;

    // TODO: Integrate with analytics service (privacy-focused)
    // Example: plausible.io, umami, or self-hosted analytics
    // Only track non-PII data
  }

  /**
   * Send metric to analytics service (placeholder)
   */
  private sendMetricToService(metric: PerformanceMetric): void {
    // TODO: Integrate with performance monitoring service
    // Example: Send to custom backend, DataDog, New Relic, etc.
    // console.log('Metric:', metric);
  }

  /**
   * Send error to tracking service (placeholder)
   */
  private sendErrorToService(error: ErrorEvent): void {
    // TODO: Integrate with error tracking service (e.g., Sentry)
    // Example:
    // Sentry.captureException(new Error(error.message), {
    //   extra: error.context,
    // });
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    avgPageLoadTime: number;
    totalErrors: number;
    recentMetrics: PerformanceMetric[];
  } {
    const pageLoadMetrics = this.metrics.filter((m) => m.name === 'page_load_time');
    const avgPageLoadTime =
      pageLoadMetrics.reduce((sum, m) => sum + m.value, 0) / pageLoadMetrics.length || 0;

    return {
      avgPageLoadTime,
      totalErrors: this.errors.length,
      recentMetrics: this.metrics.slice(-10),
    };
  }

  /**
   * Clear stored metrics and errors
   */
  clear(): void {
    this.metrics = [];
    this.errors = [];
  }
}

// Export singleton instance
export const monitoring = new MonitoringService();

// Export for testing
export { MonitoringService };
