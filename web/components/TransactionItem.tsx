import React from 'react';
import { Transaction } from '../types';
import { ArrowUpRight, ArrowDownLeft, Calendar, Edit2, Trash2, Repeat, Tag } from 'lucide-react';

interface TransactionItemProps {
    transaction: Transaction;
    onEdit?: (transaction: Transaction) => void;
    onDelete?: (id: string) => void;
    canEdit: boolean;
    canDelete: boolean;
}

const TransactionItem: React.FC<TransactionItemProps> = ({
    transaction: t,
    onEdit,
    onDelete,
    canEdit,
    canDelete
}) => {
    return (
        <div className="p-3 rounded-xl border transition-colors group bg-slate-50/50 dark:bg-white/5 border-slate-100 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/10">
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
                                <span title="Recurring Transaction" className="flex items-center">
                                    <Repeat size={12} className="text-slate-400 shrink-0" />
                                </span>
                            )}
                        </div>
                        {(canEdit || canDelete) && (
                            <div className="flex gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                {canEdit && onEdit && (
                                    <button
                                        onClick={() => onEdit(t)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:bg-brand-500/10 hover:text-brand-500 transition-colors"
                                        title="Edit"
                                        aria-label="Edit transaction"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                )}
                                {canDelete && onDelete && (
                                    <button
                                        onClick={() => onDelete(t.id)}
                                        className="p-1.5 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                                        title="Delete"
                                        aria-label="Delete transaction"
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
        </div>
    );
};

export default React.memo(TransactionItem);
