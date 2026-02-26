import React, { useState, useMemo, useCallback } from 'react';
import { Transaction } from '../types';
import { Calendar, Search, ChevronLeft, ChevronRight, Receipt, SearchX } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, addWeeks, subWeeks, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { logger } from '../utils/logger';
import TransactionItem from './TransactionItem';
import TransactionEditRow from './TransactionEditRow';

interface TransactionListProps {
    transactions: Transaction[];
    className?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onEdit?: (params: { id: string; description: string; amount: number; type: 'income' | 'expense'; category?: string }) => Promise<any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onDelete?: (id: string) => Promise<any>;
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions, className = '', onEdit, onDelete }) => {
    const [searchTerm, setSearchTerm] = React.useState('');
    const [editingId, setEditingId] = useState<string | null>(null);

    const [viewMode, setViewMode] = useState<'all' | 'month' | 'week'>('month');
    const [currentDate, setCurrentDate] = useState(new Date());

    const range = useMemo(() => {
        if (viewMode === 'month') {
            return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
        }
        if (viewMode === 'week') {
            return { start: startOfWeek(currentDate, { weekStartsOn: 1 }), end: endOfWeek(currentDate, { weekStartsOn: 1 }) };
        }
        return null; // For 'all' view
    }, [viewMode, currentDate]);

    const navigate = (dir: -1 | 1) => {
        if (viewMode === 'month') setCurrentDate(d => dir === 1 ? addMonths(d, 1) : subMonths(d, 1));
        if (viewMode === 'week') setCurrentDate(d => dir === 1 ? addWeeks(d, 1) : subWeeks(d, 1));
    };

    const periodLabel = useMemo(() => {
        if (viewMode === 'month') return format(currentDate, 'MMMM yyyy');
        if (viewMode === 'week') {
            if (!range) return '';
            return `${format(range.start, 'd MMM')} - ${format(range.end, 'd MMM')}`;
        }
        return 'All Time';
    }, [viewMode, currentDate, range]);

    const filteredTransactions = useMemo(() => {
        const searchLower = searchTerm.toLowerCase();

        return transactions.filter(t => {
            const matchesSearch = t.description.toLowerCase().includes(searchLower);

            if (viewMode === 'all') return matchesSearch;
            if (!range) return matchesSearch;

            // date-fns isWithinInterval supports timestamp numbers directly, avoiding new Date() creation
            return matchesSearch && isWithinInterval(t.date, range);
        });
    }, [transactions, searchTerm, viewMode, range]);

    const startEdit = useCallback((transaction: Transaction) => {
        setEditingId(transaction.id);
    }, []);

    const handleSave = useCallback(async (id: string, updates: { description: string; amount: number; type: 'income' | 'expense'; category?: string }) => {
        if (!onEdit) return;
        // Let the child component handle the error to update its UI state
        await onEdit({ id, ...updates });
        setEditingId(null);
    }, [onEdit]);

    const handleDelete = useCallback(async (id: string) => {
        if (!onDelete) return;
        
        if (confirm('Are you sure you want to delete this transaction?')) {
            try {
                await onDelete(id);
            } catch (error) {
                logger.error('Failed to delete transaction', error as Error);
                alert('Failed to delete transaction');
            }
        }
    }, [onDelete]);

    // Removed early return to keep UI persistent

    return (
        <div className={`glass-panel p-6 rounded-3xl space-y-4 ${className}`}>
            <div className="space-y-4 mb-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 font-mono flex items-center gap-2">
                        <Calendar size={14} />
                        Transactions History
                    </h3>
                <div
                    className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-lg"
                    role="radiogroup"
                    aria-label="Transaction view mode"
                >
                        {(['all', 'month', 'week'] as const).map((mode) => (
                            <button
                                key={mode}
                            type="button"
                            role="radio"
                            aria-checked={viewMode === mode}
                                onClick={() => setViewMode(mode)}
                                className={`px-3 py-1 text-xs rounded-md capitalize transition-colors ${
                                    viewMode === mode
                                        ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                }`}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center justify-between gap-4 flex-wrap">
                    {viewMode !== 'all' && (
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/5 rounded-lg p-1">
                            <button 
                                onClick={() => navigate(-1)}
                                className="p-1 hover:bg-white dark:hover:bg-white/10 rounded-md text-slate-500 transition-colors"
                                aria-label="Previous period"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300 min-w-[120px] text-center">
                                {periodLabel}
                            </span>
                            <button 
                                onClick={() => navigate(1)}
                                className="p-1 hover:bg-white dark:hover:bg-white/10 rounded-md text-slate-500 transition-colors"
                                aria-label="Next period"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                    
                    <div className={`relative ${viewMode === 'all' ? 'w-full' : 'flex-1 min-w-[150px]'}`}>
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search transactions..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-full pl-9 pr-4 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/50 w-full"
                        />
                    </div>
                </div>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredTransactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        {transactions.length === 0 ? (
                            <>
                                <Receipt size={48} className="mb-4 opacity-20" />
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No transactions yet</p>
                                <p className="text-xs opacity-75 mt-1">Start logging your expenses above</p>
                            </>
                        ) : searchTerm ? (
                            <>
                                <SearchX size={48} className="mb-4 opacity-20" />
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No matching transactions</p>
                                <p className="text-xs opacity-75 mt-1">Try adjusting your filters or search term</p>
                            </>
                        ) : (
                            <>
                                <Calendar size={48} className="mb-4 opacity-20" />
                                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">No transactions in this period</p>
                                <p className="text-xs opacity-75 mt-1">Try selecting a different date range</p>
                            </>
                        )}
                    </div>
                ) : (
                    filteredTransactions.map((t) => {
                        const isEditing = editingId === t.id;

                        return (
                            <div key={t.id}>
                                {isEditing ? (
                                    <TransactionEditRow
                                        transaction={t}
                                        onSave={(updates) => handleSave(t.id, updates)}
                                        onCancel={() => setEditingId(null)}
                                    />
                                ) : (
                                    <div className="bg-slate-50/50 dark:bg-white/5 border-slate-100 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/10 p-3 rounded-xl border transition-colors group">
                                        <TransactionItem
                                            transaction={t}
                                            onEdit={startEdit}
                                            onDelete={handleDelete}
                                            canEdit={!!onEdit}
                                            canDelete={!!onDelete}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default React.memo(TransactionList);