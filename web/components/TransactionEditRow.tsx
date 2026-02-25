import React, { useState } from 'react';
import { Transaction, TRANSACTION_CATEGORIES } from '../types';
import { ArrowUpRight, ArrowDownLeft, Check, X } from 'lucide-react';

interface TransactionEditRowProps {
    transaction: Transaction;
    onSave: (data: { id: string; description: string; amount: number; type: 'income' | 'expense'; category?: string }) => void;
    onCancel: () => void;
}

const TransactionEditRow: React.FC<TransactionEditRowProps> = ({ transaction: t, onSave, onCancel }) => {
    const [editDesc, setEditDesc] = useState(t.description);
    const [editAmount, setEditAmount] = useState(t.amount.toString());
    const [editType, setEditType] = useState<'income' | 'expense'>(t.type);
    const [editCategory, setEditCategory] = useState<string>(t.category || 'Uncategorized');

    const handleSave = () => {
        const amount = parseFloat(editAmount);
        if (!editDesc.trim() || isNaN(amount) || amount <= 0) {
            alert('Please enter valid description and amount');
            return;
        }

        onSave({
            id: t.id,
            description: editDesc,
            amount,
            type: editType,
            category: editCategory
        });
    };

    return (
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
                    aria-label={editType === 'income' ? 'Switch to expense' : 'Switch to income'}
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
                    onClick={handleSave}
                    className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors"
                    title="Save"
                    aria-label="Save changes"
                >
                    <Check size={18} />
                </button>
                <button
                    onClick={onCancel}
                    className="p-2.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                    title="Cancel"
                    aria-label="Cancel editing"
                >
                    <X size={18} />
                </button>
            </div>
        </div>
    );
};

export default React.memo(TransactionEditRow);
