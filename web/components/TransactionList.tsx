
import React, { useState } from 'react';
import { Transaction, TRANSACTION_CATEGORIES } from '../types';
import { ArrowUpRight, ArrowDownLeft, Calendar, Search, Edit2, Trash2, Check, X, Repeat, ChevronLeft, ChevronRight, Tag } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, addWeeks, subWeeks, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';

interface TransactionListProps {
    transactions: Transaction[];
    className?: string;
    onEdit?: (params: { id: string; description: string; amount: number; type: 'income' | 'expense'; category?: string }) => Promise<any>;
    onDelete?: (id: string) => Promise<any>;
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions, className = '', onEdit, onDelete }) => {
    const [searchTerm, setSearchTerm] = React.useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDesc, setEditDesc] = useState('');
    const [editAmount, setEditAmount] = useState('');
    const [editType, setEditType] = useState<'income' | 'expense'>('expense');
    const [editCategory, setEditCategory] = useState<string>('Uncategorized');

    const [viewMode, setViewMode] = useState<'all' | 'month' | 'week'>('month');
    const [currentDate, setCurrentDate] = useState(new Date());

    const getDateRange = () => {
        if (viewMode === 'month') {
            return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
        }
        if (viewMode === 'week') {
            return { start: startOfWeek(currentDate, { weekStartsOn: 1 }), end: endOfWeek(currentDate, { weekStartsOn: 1 }) };
        }
        return null; // For 'all' view
    };

    const navigate = (dir: -1 | 1) => {
        if (viewMode === 'month') setCurrentDate(d => dir === 1 ? addMonths(d, 1) : subMonths(d, 1));
        if (viewMode === 'week') setCurrentDate(d => dir === 1 ? addWeeks(d, 1) : subWeeks(d, 1));
    };

    const periodLabel = () => {
        if (viewMode === 'month') return format(currentDate, 'MMMM yyyy');
        if (viewMode === 'week') {
            const range = getDateRange();
            if (!range) return '';
            return `${format(range.start, 'd MMM')} - ${format(range.end, 'd MMM')}`;
        }
        return 'All Time';
    };

    const filteredTransactions = transactions.filter(t => {
        const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (viewMode === 'all') return matchesSearch;

        const range = getDateRange();
        if (!range) return matchesSearch;

        const matchesDate = isWithinInterval(new Date(t.date), range);
        return matchesSearch && matchesDate;
    });

    const startEdit = (transaction: Transaction) => {
        setEditingId(transaction.id);
        setEditDesc(transaction.description);
        setEditAmount(transaction.amount.toString());
        setEditType(transaction.type);
        setEditCategory(transaction.category || 'Uncategorized');
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditDesc('');
        setEditAmount('');
        setEditType('expense');
        setEditCategory('Uncategorized');
    };

    const saveEdit = async (id: string) => {
        if (!onEdit) return;
        
        const amount = parseFloat(editAmount);
        if (!editDesc.trim() || isNaN(amount) || amount <= 0) {
            alert('Please enter valid description and amount');
            return;
        }

        try {
            await onEdit({ id, description: editDesc, amount, type: editType, category: editCategory });
            cancelEdit();
        } catch (error) {
            console.error('Failed to update transaction:', error);
            alert('Failed to update transaction');
        }
    };

    const handleDelete = async (id: string) => {
        if (!onDelete) return;
        
        if (confirm('Are you sure you want to delete this transaction?')) {
            try {
                await onDelete(id);
            } catch (error) {
                console.error('Failed to delete transaction:', error);
                alert('Failed to delete transaction');
            }
        }
    };

    if (!transactions.length) {
        return null;
    }

    return (
        <div className={`glass-panel p-6 rounded-3xl space-y-4 ${className}`}>
            <div className="space-y-4 mb-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 font-mono flex items-center gap-2">
                        <Calendar size={14} />
                        Transactions History
                    </h3>
                    <div className="flex bg-slate-100 dark:bg-white/5 p-1 rounded-lg">
                        {(['all', 'month', 'week'] as const).map((mode) => (
                            <button
                                key={mode}
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
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-xs font-mono font-bold text-slate-600 dark:text-slate-300 min-w-[120px] text-center">
                                {periodLabel()}
                            </span>
                            <button 
                                onClick={() => navigate(1)}
                                className="p-1 hover:bg-white dark:hover:bg-white/10 rounded-md text-slate-500 transition-colors"
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
                    <div className="text-center py-8 text-slate-400 text-sm">
                        No transactions found
                    </div>
                ) : (
                    filteredTransactions.map((t) => {
                        const isEditing = editingId === t.id;

                        return (
                            <div key={t.id} className={`p-3 rounded-xl border transition-colors group ${
                                isEditing 
                                    ? 'bg-brand-500/5 border-brand-500/30' 
                                    : 'bg-slate-50/50 dark:bg-white/5 border-slate-100 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/10'
                            }`}>
                                {isEditing ? (
                                    /* Edit Mode - Mobile Friendly Vertical Layout */
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => setEditType(editType === 'expense' ? 'income' : 'expense')}
                                                className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${
                                                    editType === 'income' 
                                                        ? 'bg-emerald-500/10 text-emerald-500' 
                                                        : 'bg-red-500/10 text-red-500'
                                                }`}
                                                title="Toggle type"
                                            >
                                                {editType === 'income' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                                            </button>
                                            <input
                                                type="text"
                                                value={editDesc}
                                                onChange={(e) => setEditDesc(e.target.value)}
                                                className="flex-1 min-w-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                                                placeholder="Description"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <select
                                                value={editCategory}
                                                onChange={(e) => setEditCategory(e.target.value)}
                                                className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                                            >
                                                {TRANSACTION_CATEGORIES.map((cat) => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                value={editAmount}
                                                onChange={(e) => setEditAmount(e.target.value)}
                                                className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                                                placeholder="Amount"
                                            />
                                            <button
                                                onClick={() => saveEdit(t.id)}
                                                className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                                                title="Save"
                                            >
                                                <Check size={18} />
                                            </button>
                                            <button
                                                onClick={cancelEdit}
                                                className="p-2.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                                                title="Cancel"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    /* Display Mode - Mobile Friendly Layout */
                                    <div className="flex items-start gap-3">
                                        <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${
                                            t.type === 'income' 
                                                ? 'bg-emerald-500/10 text-emerald-500' 
                                                : 'bg-red-500/10 text-red-500'
                                        }`}>
                                            {t.type === 'income' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate">
                                                        {t.description.replace(/\s*\(Recurring\)\s*/i, '')}
                                                    </p>
                                                    {t.description.toLowerCase().includes('(recurring)') && (
                                                        <Repeat size={12} className="text-slate-400 shrink-0" title="Recurring Transaction" />
                                                    )}
                                                </div>
                                                {(onEdit || onDelete) && (
                                                    <div className="flex gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                        {onEdit && (
                                                            <button
                                                                onClick={() => startEdit(t)}
                                                                className="p-1.5 rounded-lg text-slate-400 hover:bg-brand-500/10 hover:text-brand-500 transition-colors"
                                                                title="Edit"
                                                            >
                                                                <Edit2 size={14} />
                                                            </button>
                                                        )}
                                                        {onDelete && (
                                                            <button
                                                                onClick={() => handleDelete(t.id)}
                                                                className="p-1.5 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                                                                title="Delete"
                                                            >
                                                                <Trash2 size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                                                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                                    <Calendar size={11} />
                                                    <span>{new Date(t.date).toLocaleDateString()}</span>
                                                    <span>•</span>
                                                    <span>{new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                                </div>
                                                <span className={`font-bold font-mono text-sm ${
                                                    t.type === 'income' ? 'text-emerald-500' : 'text-red-500'
                                                }`}>
                                                    {t.type === 'income' ? '+' : '-'}₹{t.amount.toLocaleString('en-IN')}
                                                </span>
                                                {t.category && t.category !== 'Uncategorized' && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600 dark:text-brand-400 text-[10px] font-semibold">
                                                        <Tag size={9} />
                                                        {t.category}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
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
