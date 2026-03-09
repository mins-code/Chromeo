import React, { useState } from 'react';
import Button from './Button';
import { X, RefreshCw } from 'lucide-react';
import { RecurrenceConfig } from '../types';

interface RecurringPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: RecurrenceConfig) => void;
  initialConfig?: RecurrenceConfig;
}

const RecurringPlanModal: React.FC<RecurringPlanModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialConfig,
}) => {
  const [frequency, setFrequency] = useState<RecurrenceConfig['frequency']>(
    initialConfig?.frequency || 'weekly'
  );
  const [interval, setInterval] = useState(initialConfig?.interval || 1);
  const [selectedDays, setSelectedDays] = useState<number[]>(
    initialConfig?.days || [1, 2, 3, 4, 5]
  ); // Default Mon-Fri

  // Close on Escape key
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      frequency,
      interval,
      days: frequency === 'weekly' ? selectedDays : undefined,
    });
    onClose();
  };

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    );
  };

  const weekDays = [
    { label: 'S', full: 'Sunday', value: 0 },
    { label: 'M', full: 'Monday', value: 1 },
    { label: 'T', full: 'Tuesday', value: 2 },
    { label: 'W', full: 'Wednesday', value: 3 },
    { label: 'T', full: 'Thursday', value: 4 },
    { label: 'F', full: 'Friday', value: 5 },
    { label: 'S', full: 'Saturday', value: 6 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-xl border border-slate-200 dark:border-white/10 overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recurring-plan-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-white/5">
          <h3
            id="recurring-plan-title"
            className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"
          >
            <RefreshCw size={20} className="text-brand-500" />
            Recurring Plan Settings
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
            aria-label="Close"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Frequency */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Repeat Frequency
            </label>
            <div className="grid grid-cols-3 gap-2">
              {['daily', 'weekly', 'monthly'].map((freq) => (
                <button
                  key={freq}
                  type="button"
                  onClick={() => setFrequency(freq as any)}
                  aria-pressed={frequency === freq}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                    frequency === freq
                      ? 'bg-brand-500 text-white border-brand-500'
                      : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:border-brand-500/50'
                  }`}
                >
                  {freq.charAt(0).toUpperCase() + freq.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Weekly Options */}
          {frequency === 'weekly' && (
            <div className="space-y-3 animate-fade-in">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Repeat On
              </label>
              <div className="flex justify-between gap-1">
                {weekDays.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    aria-pressed={selectedDays.includes(day.value)}
                    aria-label={`Repeat on ${day.full}`}
                    className={`w-10 h-10 rounded-full text-sm font-bold transition-all ${
                      selectedDays.includes(day.value)
                        ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/25'
                        : 'bg-slate-100 dark:bg-white/5 text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Interval */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Interval
            </label>
            <div className="flex items-center gap-2">
              <span className="text-slate-500">Every</span>
              <input
                type="number"
                min="1"
                max="99"
                value={interval}
                onChange={(e) => setInterval(parseInt(e.target.value) || 1)}
                aria-label="Interval value"
                className="w-16 px-3 py-2 rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-800 text-center font-bold outline-none focus:border-brand-500"
              />
              <span className="text-slate-500">
                {frequency === 'daily' ? 'day(s)' : frequency === 'weekly' ? 'week(s)' : 'month(s)'}
              </span>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <Button variant="ghost" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Save Recurring Rule
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecurringPlanModal;
