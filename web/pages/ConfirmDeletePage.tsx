import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { AlertTriangle, CheckCircle2, Loader2, XCircle } from 'lucide-react';
import Button from '../components/Button';

type DeletionStatus = 'loading' | 'confirming' | 'success' | 'error' | 'expired';

const ConfirmDeletePage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState<DeletionStatus>('loading');
    const [errorMessage, setErrorMessage] = useState('');

    const token = searchParams.get('token');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setErrorMessage('No confirmation token provided.');
            return;
        }

        // Wait for user to click confirm
        setStatus('confirming');
    }, [token]);

    const handleConfirmDeletion = async () => {
        setStatus('loading');

        try {
            const { data, error } = await supabase.functions.invoke('account-deletion', {
                body: { action: 'confirm', token }
            });

            if (error) throw error;

            if (data.success) {
                setStatus('success');
                // Sign out after successful deletion
                await supabase.auth.signOut();
            } else {
                throw new Error(data.error || 'Failed to delete account');
            }
        } catch (err: any) {
            console.error('Deletion error:', err);
            setStatus('error');
            setErrorMessage(err.message || 'Failed to delete account. Please try again.');
        }
    };

    const handleCancel = () => {
        navigate('/settings');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-red-500 to-red-600 p-6 text-white">
                    <div className="flex items-center gap-3">
                        <AlertTriangle size={32} />
                        <div>
                            <h1 className="text-2xl font-bold">Account Deletion</h1>
                            <p className="text-red-100 text-sm">This action is permanent</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {status === 'loading' && (
                        <div className="text-center py-8">
                            <Loader2 size={48} className="animate-spin text-red-500 mx-auto mb-4" />
                            <p className="text-slate-600 dark:text-slate-300">Processing...</p>
                        </div>
                    )}

                    {status === 'confirming' && (
                        <div className="space-y-6">
                            <div className="bg-red-50 dark:bg-red-500/10 rounded-xl p-4 border border-red-200 dark:border-red-500/20">
                                <h3 className="font-bold text-red-700 dark:text-red-400 mb-2">
                                    ⚠️ Final Warning
                                </h3>
                                <ul className="text-sm text-red-600/80 dark:text-red-300/80 space-y-2">
                                    <li>• All your tasks, events, and reminders will be deleted</li>
                                    <li>• All your budget data and transactions will be erased</li>
                                    <li>• All your routines and settings will be removed</li>
                                    <li>• Your partnerships and team memberships will be terminated</li>
                                    <li>• <strong>This action cannot be undone</strong></li>
                                </ul>
                            </div>

                            <div className="flex gap-3">
                                <Button
                                    variant="secondary"
                                    onClick={handleCancel}
                                    className="flex-1"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    variant="danger"
                                    onClick={handleConfirmDeletion}
                                    className="flex-1"
                                >
                                    Delete My Account
                                </Button>
                            </div>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="text-center py-8">
                            <CheckCircle2 size={64} className="text-green-500 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                                Account Deleted
                            </h3>
                            <p className="text-slate-600 dark:text-slate-300 mb-6">
                                Your account and all associated data have been permanently deleted.
                                Thank you for using ChronoDeX.
                            </p>
                            <Button onClick={() => navigate('/')}>
                                Return to Home
                            </Button>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="text-center py-8">
                            <XCircle size={64} className="text-red-500 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                                Error
                            </h3>
                            <p className="text-slate-600 dark:text-slate-300 mb-6">
                                {errorMessage}
                            </p>
                            <div className="flex gap-3 justify-center">
                                <Button variant="secondary" onClick={() => navigate('/settings')}>
                                    Back to Settings
                                </Button>
                                <Button onClick={() => setStatus('confirming')}>
                                    Try Again
                                </Button>
                            </div>
                        </div>
                    )}

                    {status === 'expired' && (
                        <div className="text-center py-8">
                            <XCircle size={64} className="text-amber-500 mx-auto mb-4" />
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">
                                Link Expired
                            </h3>
                            <p className="text-slate-600 dark:text-slate-300 mb-6">
                                This deletion link has expired. Please request a new one from the settings page.
                            </p>
                            <Button onClick={() => navigate('/settings')}>
                                Go to Settings
                            </Button>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-white/5">
                    <p className="text-xs text-slate-500 text-center">
                        If you didn't request this deletion, please secure your account immediately.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDeletePage;
