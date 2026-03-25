import './index.css';
import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';

// ---------------------------------------------------------------------------
// Web back-navigation guard (PWA / mobile browser)
// Push a sentinel history entry so that a swipe-back or browser-back always
// has something to land on *inside* the app rather than closing the tab.
// When the user reaches the sentinel we immediately push it again, keeping
// them trapped inside the app.  This mirrors what native apps do by default.
// ---------------------------------------------------------------------------
(function installWebBackGuard() {
    // Only needed in a browser context (not in SSR / Capacitor native).
    if (typeof window === 'undefined') return;

    // Skip in Capacitor native — the Android hardware back button is handled
    // separately via @capacitor/app in App.tsx.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).Capacitor?.isNativePlatform?.()) return;

    const SENTINEL = { appBackGuard: true };

    // Push the sentinel below the current page so there is always a "previous"
    // entry within the app history stack.
    window.history.pushState(SENTINEL, '');

    window.addEventListener('popstate', (event) => {
        if (event.state && event.state.appBackGuard) {
            // Reached the sentinel — push it again so the guard resets.
            window.history.pushState(SENTINEL, '');
        }
    });
})();
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import { QueryProvider } from './context/QueryProvider';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load pages
const ConfirmDeletePage = lazy(() => import('./pages/ConfirmDeletePage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));

// Verification component
const VerifyA11yLayout = lazy(() => import('./components/Layout').then(module => {
    return {
        default: () => (
            <module.Layout
                currentView="day"
                onNavigate={() => {}}
                onAddTask={() => {}}
                onEditTags={() => {}}
                onCreateRoutine={() => {}}
                onOpenAI={() => {}}
                onCalendarDateSelect={() => {}}
                calendarTags={[]}
                userStats={{
                    userName: "Test User",
                    pendingTasks: 0,
                    totalTasks: 0,
                    budgetRemaining: 0,
                }}
                currentTheme="dark"
            >
                <div className="p-10 text-white">Verification Layout View</div>
            </module.Layout>
        )
    };
}));

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const LoadingFallback = () => (
  <div className="h-screen w-screen flex items-center justify-center bg-slate-900">
    <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
  </div>
);

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <QueryProvider>
          <AuthProvider>
            <ThemeProvider>
              <Routes>
                <Route 
                  path="/confirm-delete" 
                  element={
                    <Suspense fallback={<LoadingFallback />}>
                      <ConfirmDeletePage />
                    </Suspense>
                  } 
                />
                <Route 
                  path="/reset-password" 
                  element={
                    <Suspense fallback={<LoadingFallback />}>
                      <ResetPasswordPage />
                    </Suspense>
                  } 
                />
                <Route
                  path="/verify-a11y"
                  element={
                    <Suspense fallback={<LoadingFallback />}>
                      <VerifyA11yLayout />
                    </Suspense>
                  }
                />
                <Route path="/*" element={<App />} />
              </Routes>
            </ThemeProvider>
          </AuthProvider>
        </QueryProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);

