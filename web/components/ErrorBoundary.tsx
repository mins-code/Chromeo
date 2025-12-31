import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import Button from './Button';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * React Error Boundary component for graceful error handling.
 * Catches JavaScript errors in child component tree and displays
 * a fallback UI instead of crashing the whole app.
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  public render(): React.ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertCircle className="text-red-500" size={32} />
            </div>
            
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
              Something went wrong
            </h2>
            
            <p className="text-slate-500 dark:text-slate-400 mb-6">
              We're sorry, but something unexpected happened. Please try refreshing the page.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <details className="mb-6 text-left bg-slate-100 dark:bg-slate-800 rounded-xl p-4 text-sm">
                <summary className="cursor-pointer font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Error Details (Development Only)
                </summary>
                <pre className="whitespace-pre-wrap text-red-600 dark:text-red-400 overflow-auto max-h-40 font-mono text-xs">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              <Button variant="secondary" onClick={this.handleReset}>
                Try Again
              </Button>
              <Button variant="primary" onClick={this.handleReload}>
                <RefreshCw size={16} className="mr-2" />
                Reload Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
