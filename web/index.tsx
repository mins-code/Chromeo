import './index.css';
import React, { lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import { QueryProvider } from './context/QueryProvider';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load the confirmation page
const ConfirmDeletePage = lazy(() => import('./pages/ConfirmDeletePage'));

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
                <Route path="/*" element={<App />} />
              </Routes>
            </ThemeProvider>
          </AuthProvider>
        </QueryProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);

