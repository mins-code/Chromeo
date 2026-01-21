/**
 * Performance monitoring utilities for Core Web Vitals
 * 
 * Provides tools to measure and track application performance metrics.
 * Use in production to monitor real user performance.
 */

import { logger } from './logger';

export interface PerformanceMetrics {
  domContentLoaded: number;
  loadComplete: number;
  ttfb: number;
}

export interface ComponentRenderMetrics {
  componentName: string;
  renderTime: number;
  timestamp: number;
}

/**
 * Performance monitoring singleton
 */
export const performanceMonitor = {
  /**
   * Track page load performance metrics
   * @returns Performance metrics or null if not available
   */
  measureLoadTime: (): PerformanceMetrics | null => {
    if (typeof window !== 'undefined' && window.performance) {
      const entries = performance.getEntriesByType('navigation');
      if (entries.length > 0) {
        const timing = entries[0] as PerformanceNavigationTiming;
        return {
          domContentLoaded: timing.domContentLoadedEventEnd - timing.startTime,
          loadComplete: timing.loadEventEnd - timing.startTime,
          ttfb: timing.responseStart - timing.requestStart,
        };
      }
    }
    return null;
  },

  /**
   * Mark a custom performance point
   * @param name - Unique name for the mark
   */
  mark: (name: string): void => {
    if (typeof window !== 'undefined' && window.performance) {
      performance.mark(name);
    }
  },

  /**
   * Measure between two marks
   * @param name - Name for the measurement
   * @param startMark - Start mark name
   * @param endMark - End mark name
   * @returns PerformanceMeasure or null if unavailable
   */
  measure: (name: string, startMark: string, endMark: string): PerformanceMeasure | null => {
    if (typeof window !== 'undefined' && window.performance) {
      try {
        return performance.measure(name, startMark, endMark);
      } catch {
        return null;
      }
    }
    return null;
  },

  /**
   * Log performance metrics to the console/logger
   */
  logMetrics: (): void => {
    const metrics = performanceMonitor.measureLoadTime();
    if (metrics) {
      logger.debug('Page Load Metrics', {
        'DOM Content Loaded': `${metrics.domContentLoaded.toFixed(2)}ms`,
        'Load Complete': `${metrics.loadComplete.toFixed(2)}ms`,
        'Time to First Byte': `${metrics.ttfb.toFixed(2)}ms`,
      });
    }
  },

  /**
   * Track component render time using performance marks
   * @param componentName - Name of the component
   * @param callback - Callback to measure
   * @returns The result of the callback
   */
  trackComponentRender: async <T>(
    componentName: string,
    callback: () => T | Promise<T>
  ): Promise<T> => {
    const startMark = `${componentName}-start`;
    const endMark = `${componentName}-end`;
    
    performanceMonitor.mark(startMark);
    const result = await callback();
    performanceMonitor.mark(endMark);
    
    const measure = performanceMonitor.measure(
      `${componentName}-render`,
      startMark,
      endMark
    );
    
    if (measure && measure.duration > 16) {
      // Log if render takes longer than 1 frame (16ms)
      logger.debug(`Slow render: ${componentName}`, { duration: `${measure.duration.toFixed(2)}ms` });
    }
    
    return result;
  },

  /**
   * Get Long Animation Frames (if browser supports it)
   * Useful for detecting janky animations
   */
  observeLongTasks: (callback: (duration: number) => void): (() => void) | null => {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            callback(entry.duration);
          }
        });
        observer.observe({ entryTypes: ['longtask'] });
        return () => observer.disconnect();
      } catch {
        // longtask not supported
        return null;
      }
    }
    return null;
  },
};

/**
 * HOC for timing component renders (development only)
 */
export function withPerformanceTracking<T extends object>(
  WrappedComponent: React.ComponentType<T>,
  componentName: string
): React.ComponentType<T> {
  if (import.meta.env.PROD) {
    // In production, return component as-is to avoid overhead
    return WrappedComponent;
  }
  
  const TrackedComponent = (props: T) => {
    performanceMonitor.mark(`${componentName}-render-start`);
    
    // Use useEffect equivalent timing
    requestAnimationFrame(() => {
      performanceMonitor.mark(`${componentName}-render-end`);
      performanceMonitor.measure(
        `${componentName}-render`,
        `${componentName}-render-start`,
        `${componentName}-render-end`
      );
    });
    
    return <WrappedComponent {...props} />;
  };
  
  TrackedComponent.displayName = `WithPerformance(${componentName})`;
  return TrackedComponent;
}
