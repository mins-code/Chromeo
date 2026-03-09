import React, { useState } from 'react';
import { RecurringTransaction } from '../types';
import { Repeat, Edit2, Trash2, Check, X, Calendar, IndianRupee } from 'lucide-react';
import { format } from 'date-fns';
import { logger } from '../utils/logger';

interface RecurringBillsManagerProps {
  recurring: RecurringTransaction[];
  onUpdate: (params: {
    id: string;
    updates: {
      description?: string;
      amount?: number;
      type?: 'income' | 'expense';
      frequency?: 'daily' | 'weekly' | 'monthly' | 'yearly';
      nextDueDate?: string;
    };
  }) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  className?: string;
}

const FREQUENCY_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

const RecurringBillsManager: React.FC<RecurringBillsManagerProps> = ({
  recurring,
  onUpdate,
  onDelete,
  className = '',
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDesc, setEditDesc] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editType, setEditType] = useState<'income' | 'expense'>('expense');
  const [editFrequency, setEditFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>(
    'monthly'
  );
  const [isLoading, setIsLoading] = useState(false);

  const startEdit = (item: RecurringTransaction) => {
    setEditingId(item.id);
    setEditDesc(item.description);
    setEditAmount(item.amount.toString());
    setEditType(item.type);
    setEditFrequency(item.frequency);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditDesc('');
    setEditAmount('');
    setEditType('expense');
    setEditFrequency('monthly');
  };

  const saveEdit = async (id: string) => {
    const amount = parseFloat(editAmount);
    if (!editDesc.trim() || isNaN(amount) || amount <= 0) {
      alert('Please enter valid description and amount');
      return;
    }

    setIsLoading(true);
    try {
      await onUpdate({
        id,
        updates: {
          description: editDesc,
          amount,
          type: editType,
          frequency: editFrequency,
        },
      });
      cancelEdit();
    } catch (error) {
      logger.error('Failed to update recurring transaction', error as Error);
      alert('Failed to update. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string, description: string) => {
    if (!confirm(`Are you sure you want to cancel "${description}" recurring bill?`)) {
      return;
    }

    setIsLoading(true);
    try {
      await onDelete(id);
    } catch (error) {
      logger.error('Failed to delete recurring transaction', error as Error);
      alert('Failed to delete. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (recurring.length === 0) {
    return null;
  }

  return (
    <div className={`glass-panel p-6 rounded-3xl space-y-4 ${className}`}>
      <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 font-mono flex items-center gap-2">
        <Repeat size={14} />
        Recurring Bills
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Manage your scheduled recurring transactions. Edit or cancel any bill.
      </p>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
        {recurring.map((item) => {
          const isEditing = editingId === item.id;
          const nextDue = new Date(item.nextDueDate);
          const isOverdue = nextDue < new Date();

          return (
            <div
              key={item.id}
              className={`p-3 rounded-xl border transition-colors group ${
                isEditing
                  ? 'bg-brand-500/5 border-brand-500/30'
                  : 'bg-slate-50/50 dark:bg-white/5 border-slate-100 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/10'
              }`}
            >
              {isEditing ? (
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
                      <IndianRupee size={18} />
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
                      className="w-24 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                      placeholder="Amount"
                    />
                    <select
                      value={editFrequency}
                      onChange={(e) => setEditFrequency(e.target.value as typeof editFrequency)}
                      className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                    <button
                      onClick={() => saveEdit(item.id)}
                      disabled={isLoading}
                      className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                      title="Save"
                      aria-label="Save changes"
                    >
                      <Check size={18} />
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="p-2.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                      title="Cancel"
                      aria-label="Cancel editing"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center ${
                      item.type === 'income'
                        ? 'bg-emerald-500/10 text-emerald-500'
                        : 'bg-red-500/10 text-red-500'
                    }`}
                  >
                    <Repeat size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm truncate">
                        {item.description}
                      </p>
                      <div className="flex gap-1 shrink-0 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEdit(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-brand-500/10 hover:text-brand-500 transition-colors"
                          title="Edit"
                          aria-label="Edit recurring transaction"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.description)}
                          disabled={isLoading}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-colors disabled:opacity-50"
                          title="Delete"
                          aria-label="Cancel recurring transaction"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                      <span
                        className={`font-bold font-mono text-sm ${
                          item.type === 'income' ? 'text-emerald-500' : 'text-red-500'
                        }`}
                      >
                        {item.type === 'income' ? '+' : '-'}₹{item.amount.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs text-slate-400 bg-slate-100 dark:bg-white/10 px-2 py-0.5 rounded-full">
                        {FREQUENCY_LABELS[item.frequency] || item.frequency}
                      </span>
                      <span
                        className={`flex items-center gap-1 text-xs ${
                          isOverdue ? 'text-red-500' : 'text-slate-500'
                        }`}
                      >
                        <Calendar size={10} />
                        Next: {format(nextDue, 'MMM d, yyyy')}
                        {isOverdue && <span className="font-medium">(Overdue)</span>}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(RecurringBillsManager);
