import React, { useState } from 'react';
import { Transaction, TRANSACTION_CATEGORIES } from '../types';
import { ArrowUpRight, ArrowDownLeft, Check, X } from 'lucide-react';
import { logger } from '../utils/logger';

interface TransactionEditRowProps {
    transaction: Transaction;
    onSave: (updates: { description: string; amount: number; type: 'income' | 'expense'; category?: string }) => Promise<void>;
    onCancel: () => void;
}

const TransactionEditRow: React.FC<TransactionEditRowProps> = ({ transaction, onSave, onCancel }) => {
    const [description, setDescription] = useState(transaction.description);
    const [amount, setAmount] = useState(transaction.amount.toString());
    const [type, setType] = useState(transaction.type);
    const [category, setCategory] = useState(transaction.category || 'Uncategorized');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        const parsedAmount = parseFloat(amount);
        if (!description.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
            alert('Please enter valid description and amount');
            return;
        }

        setIsSaving(true);
        try {
            await onSave({
                description,
                amount: parsedAmount,
                type,
                category
            });
        } catch (error) {
            logger.error('Failed to update transaction', error as Error);
            alert('Failed to update transaction');
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-brand-500/5 border-brand-500/30 p-3 rounded-xl border transition-colors group">
            <div className="space-y-3">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setType(type === 'expense' ? 'income' : 'expense')}
                        className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center transition-colors ${
                            type === 'income'
                                ? 'bg-emerald-500/10 text-emerald-500'
                                : 'bg-red-500/10 text-red-500'
                        }`}
                        title="Toggle type"
                        aria-label={type === 'income' ? 'Switch to expense' : 'Switch to income'}
                    >
                        {type === 'income' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                    </button>
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="flex-1 min-w-0 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                        placeholder="Description"
                        disabled={isSaving}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                        disabled={isSaving}
                    >
                        {TRANSACTION_CATEGORIES.map((cat) => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                        placeholder="Amount"
                        disabled={isSaving}
                    />
                    <button
                        onClick={handleSave}
                        className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                        title="Save"
                        aria-label="Save changes"
                        disabled={isSaving}
                    >
                        <Check size={18} />
                    </button>
                    <button
                        onClick={onCancel}
                        className="p-2.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
                        title="Cancel"
                        aria-label="Cancel editing"
                        disabled={isSaving}
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default React.memo(TransactionEditRow);
