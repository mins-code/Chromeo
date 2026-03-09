import React, { useState } from 'react';
import { format, addDays } from 'date-fns';
import { Calendar as CalendarIcon, Clock, ArrowRight, Check, X } from 'lucide-react';
import Button from './Button';
import { DayPlan } from '../types';

interface CloneDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClone: (targetDate: Date, adjustTime: boolean, timeOffsetMinutes: number) => void;
  sourceDate: Date;
  taskCount: number;
  selectedTaskCount: number;
}

const CloneDayModal: React.FC<CloneDayModalProps> = ({
  isOpen,
  onClose,
  onClone,
  sourceDate,
  taskCount,
  selectedTaskCount,
}) => {
  const [targetDate, setTargetDate] = useState<string>(
    format(addDays(sourceDate, 1), 'yyyy-MM-dd')
  );
  const [adjustTime, setAdjustTime] = useState(false);
  const [timeOffset, setTimeOffset] = useState(0); // Minutes

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onClone(new Date(targetDate), adjustTime, timeOffset);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="clone-day-title"
    >
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md border border-slate-200 dark:border-white/10 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-white/10">
          <h2
            id="clone-day-title"
            className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2"
          >
            <CalendarIcon className="text-brand-500" />
            Clone Day Plan
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {selectedTaskCount > 0
              ? `Copy ${selectedTaskCount} selected tasks to another day`
              : `Copy all ${taskCount} tasks from ${format(sourceDate, 'MMMM d')} to another day`}
          </p>
        </div>

        {/* content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Target Date */}
          <div className="space-y-2">
            <label
              htmlFor="target-date"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Target Date
            </label>
            <input
              id="target-date"
              type="date"
              required
              autoFocus
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="w-full px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-800 dark:text-slate-100"
            />
          </div>

          {/* Time Adjustment */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <label
                htmlFor="shift-times-toggle"
                className="flex items-center gap-2 cursor-pointer"
              >
                <Clock size={18} className="text-slate-400" />
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Shift Times
                </span>
              </label>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  id="shift-times-toggle"
                  type="checkbox"
                  checked={adjustTime}
                  onChange={(e) => setAdjustTime(e.target.checked)}
                  className="sr-only peer"
                  aria-label="Shift Times"
                />
                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 dark:peer-focus:ring-brand-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-brand-600"></div>
              </label>
            </div>

            {adjustTime && (
              <div className="animate-fade-in">
                <label
                  htmlFor="time-offset"
                  className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5"
                >
                  Shift tasks by (minutes)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    id="time-offset"
                    type="number"
                    value={timeOffset}
                    onChange={(e) => setTimeOffset(Number(e.target.value))}
                    className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 text-sm"
                    placeholder="0"
                  />
                  <div className="text-xs text-slate-400">Use negative for earlier</div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex-1">
              <ArrowRight size={18} />
              Clone Plan
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CloneDayModal;
