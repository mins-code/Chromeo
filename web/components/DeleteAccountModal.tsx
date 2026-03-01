import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import Button from './Button';
import Input from './Input';
import { AlertTriangle, Loader2, Eye, EyeOff, Trash2, X, CheckCircle2 } from 'lucide-react';
import { logger } from '../utils/logger';

interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeleted: () => void;
  userEmail: string;
}

const DeleteAccountModal: React.FC<DeleteAccountModalProps> = ({ 
  isOpen, 
  onClose, 
  onDeleted,
  userEmail 
}) => {
  const [password, setPassword] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate confirmation text
    if (confirmText !== 'DELETE') {
      setError('Please type DELETE to confirm.');
      return;
    }

    // Validate password
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('account-deletion', {
        body: { action: 'delete-with-password', password }
      });

      if (fnError) {
        // fnError.message is the generic "Edge Function returned a non-2xx status code".
        // The real error from the server lives in the response body (fnError.context).
        let serverMessage: string | null = null;
        try {
          const errorBody = await fnError.context?.json();
          serverMessage = errorBody?.error || null;
        } catch {
          // body not parseable – fall through to generic message
        }
        throw new Error(serverMessage || fnError.message || 'Failed to delete account');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to delete account');
      }

      // Success - show success state
      setIsDeleted(true);
      
      // Sign out and notify parent
      setTimeout(async () => {
        await supabase.auth.signOut();
        onDeleted();
      }, 2000);

    } catch (err: any) {
      logger.error('Delete account error', err as Error);
      setError(err.message || 'Failed to delete account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    if (!isLoading && !isDeleted) {
      setPassword('');
      setConfirmText('');
      setError('');
      onClose();
    }
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, isDeleted]); // Re-attach if state changes to ensure handleClose has latest scope

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-scale-in border border-slate-200 dark:border-white/10"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-account-title"
      >
        
        {/* Header */}
        <div className="bg-gradient-to-r from-red-500 to-red-600 p-5 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle size={24} />
              <div>
                <h2 id="delete-account-title" className="text-xl font-bold">Delete Account</h2>
                <p className="text-red-100 text-sm">This action is permanent</p>
              </div>
            </div>
            {!isLoading && !isDeleted && (
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {isDeleted ? (
            <div className="text-center py-6">
              <CheckCircle2 size={64} className="text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                Account Deleted
              </h3>
              <p className="text-slate-600 dark:text-slate-300">
                Your account has been permanently deleted. Redirecting...
              </p>
            </div>
          ) : (
            <form onSubmit={handleDelete} className="space-y-5">
              {/* Warning Box */}
              <div className="bg-red-50 dark:bg-red-500/10 rounded-xl p-4 border border-red-200 dark:border-red-500/20">
                <p className="text-sm text-red-600/80 dark:text-red-300/80 space-y-1">
                  <strong className="block text-red-700 dark:text-red-400">⚠️ Warning:</strong>
                  • All your tasks, events, and reminders will be deleted<br />
                  • All your budget data will be erased<br />
                  • All settings and partnerships will be removed<br />
                  • <strong>This cannot be undone</strong>
                </p>
              </div>

              {/* Email Display */}
              <div className="bg-slate-100 dark:bg-slate-800 rounded-xl p-3 text-center">
                <p className="text-xs text-slate-500 mb-1">Deleting account for</p>
                <p className="font-medium text-slate-800 dark:text-white">{userEmail}</p>
              </div>

              {/* Password Input */}
              <div className="relative">
                <Input
                  label="Enter your password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoFocus
                  className="pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[35px] text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>

              {/* Confirmation Text */}
              <div>
                <label
                  htmlFor="confirm-delete"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Type <span className="font-bold text-red-500">DELETE</span> to confirm
                </label>
                <input
                  id="confirm-delete"
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
                  placeholder="Type DELETE"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                  required
                />
              </div>

              {/* Error Message */}
              {error && (
                <div
                  role="alert"
                  aria-live="assertive"
                  className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm"
                >
                  {error}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleClose}
                  className="flex-1"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  className="flex-1 flex items-center justify-center gap-2"
                  disabled={isLoading || confirmText !== 'DELETE' || !password}
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin" size={18} />
                  ) : (
                    <>
                      <Trash2 size={16} />
                      Delete Forever
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default DeleteAccountModal;
