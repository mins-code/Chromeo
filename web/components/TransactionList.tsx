
import React, { useState } from 'react';
import { Transaction } from '../types';
import { ArrowUpRight, ArrowDownLeft, Calendar, Search, Edit2, Trash2, Check, X } from 'lucide-react';

interface TransactionListProps {
    transactions: Transaction[];
    className?: string;
    onEdit?: (params: { id: string; description: string; amount: number; type: 'income' | 'expense' }) => Promise<any>;
    onDelete?: (id: string) => Promise<any>;
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions, className = '', onEdit, onDelete }) => {
    const [searchTerm, setSearchTerm] = React.useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDesc, setEditDesc] = useState('');
    const [editAmount, setEditAmount] = useState('');
    const [editType, setEditType] = useState<'income' | 'expense'>('expense');

    const filteredTransactions = transactions.filter(t => 
        t.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const startEdit = (transaction: Transaction) => {
        setEditingId(transaction.id);
        setEditDesc(transaction.description);
        setEditAmount(transaction.amount.toString());
        setEditType(transaction.type);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditDesc('');
        setEditAmount('');
        setEditType('expense');
    };

    const saveEdit = async (id: string) => {
        if (!onEdit) return;
        
        const amount = parseFloat(editAmount);
        if (!editDesc.trim() || isNaN(amount) || amount <= 0) {
            alert('Please enter valid description and amount');
            return;
        }

        try {
            await onEdit({ id, description: editDesc, amount, type: editType });
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
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 font-mono">
                    Recent Transactions
                </h3>
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-full pl-9 pr-4 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/50 w-48"
                    />
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
                                                <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate">{t.description}</p>
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

export default TransactionList;
