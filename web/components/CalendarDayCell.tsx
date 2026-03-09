import React, { memo, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { format, differenceInCalendarDays } from 'date-fns';
import { Task, RecurringTransaction } from '../types';
import DraggableTask from './DraggableTask';
import { DollarSign, X } from 'lucide-react';

interface CalendarDayCellProps {
  day: number | null;
  date: Date | null;
  tasks: Task[];
  financialItems?: RecurringTransaction[];
  isToday: boolean;
  onClick: () => void;
  taskDatesMap?: Map<string, { start: Date; startNormalized: Date; end?: Date }>;
}

const CalendarDayCell = memo(
  ({
    day,
    date,
    tasks,
    financialItems = [],
    isToday,
    onClick,
    taskDatesMap,
  }: CalendarDayCellProps) => {
    const [showFinancialPopup, setShowFinancialPopup] = useState(false);

    // ⚡ Bolt Optimization: Calculate dates once per render instead of inside the task loop
    const today = new Date();
    // Calculate distance of this cell to today once (constant for the cell)
    const daysFromTodayCurrent = date ? Math.abs(differenceInCalendarDays(today, date)) : 0;

    const droppableId = date ? format(date, 'yyyy-MM-dd') : `empty-${day}`;
    const { setNodeRef, isOver } = useDroppable({
      id: droppableId,
      data: { date },
      disabled: !date,
    });

    const handleFinancialClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      setShowFinancialPopup(true);
    };

    return (
      <div
        ref={setNodeRef}
        onClick={onClick}
        className={`
        relative border rounded-xl p-2 flex flex-col transition-all cursor-pointer overflow-hidden
        ${!day ? 'border-transparent cursor-default' : 'glass border-slate-200 dark:border-white/5 hover:border-brand-500/30 hover:shadow-lg'}
        ${isToday ? 'bg-brand-500/5 border-brand-500/30' : ''}
        ${isOver ? 'ring-2 ring-brand-500 bg-brand-500/10' : ''}
      `}
      >
        {day && (
          <>
            <div className="flex items-center justify-between mb-1">
              <span
                className={`text-sm font-semibold ${isToday ? 'text-brand-500' : 'text-slate-400'}`}
              >
                {day}
              </span>
              {/* Financial Indicator */}
              {financialItems.length > 0 && (
                <button
                  onClick={handleFinancialClick}
                  className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors group"
                  title="Financial items due"
                >
                  <DollarSign size={10} className="text-emerald-500" />
                  <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                    {financialItems.length}
                  </span>
                </button>
              )}
            </div>
            <div className="flex-1 flex flex-col gap-1 overflow-hidden">
              {tasks.slice(0, 3).map((task) => {
                // Check if this is a recurring task
                const isRecurring = task.recurrence && task.recurrence.frequency !== 'none';

                // If recurring, check if this date is the most recent/relevant occurrence
                let isMostRecentOccurrence = true;
                if (isRecurring && date && (task.dueDate || task.reminderTime)) {
                  let taskDate: Date;
                  // ⚡ Bolt Optimization: Use pre-parsed date from map if available
                  if (taskDatesMap?.has(task.id)) {
                    taskDate = taskDatesMap.get(task.id)!.start;
                  } else {
                    const taskDateStr = (task.dueDate || task.reminderTime) as string;
                    taskDate = new Date(taskDateStr);
                  }

                  // Calculate days from today for the task's original date
                  // ⚡ Optimization: Use differenceInCalendarDays to avoid creating intermediate Date objects
                  const daysFromTodayOriginal = Math.abs(differenceInCalendarDays(today, taskDate));

                  // The most recent occurrence is the one closest to today
                  // If the current cell's date is farther from today than the original date, dull it
                  isMostRecentOccurrence = daysFromTodayCurrent <= daysFromTodayOriginal;
                }

                // Apply opacity if it's a recurring task but not the most recent occurrence
                const shouldDull = isRecurring && !isMostRecentOccurrence;

                return (
                  <div key={task.id} className={shouldDull ? 'opacity-50' : ''}>
                    <DraggableTask task={task} variant="chip" />
                  </div>
                );
              })}
              {tasks.length > 3 && (
                <div className="text-[10px] text-slate-500 pl-1">+{tasks.length - 3} more</div>
              )}
            </div>
          </>
        )}

        {/* Financial Items Popup */}
        {showFinancialPopup && financialItems.length > 0 && (
          <div
            className="absolute inset-0 z-30 flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="absolute inset-0 bg-black/40 backdrop-blur-sm rounded-xl"
              onClick={() => setShowFinancialPopup(false)}
            />
            <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-slate-200 dark:border-white/10 p-3 m-1 w-full max-h-full overflow-y-auto">
              <button
                onClick={() => setShowFinancialPopup(false)}
                className="absolute top-1 right-1 p-0.5 rounded-full hover:bg-black/5 dark:hover:bg-white/5 text-slate-400"
              >
                <X size={12} />
              </button>
              <div className="flex items-center gap-1.5 mb-2">
                <DollarSign size={12} className="text-emerald-500" />
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Bills Due
                </span>
              </div>
              <div className="space-y-1.5">
                {financialItems.map((item) => (
                  <div
                    key={item.id}
                    className={`p-1.5 rounded-md text-[10px] ${
                      item.type === 'expense'
                        ? 'bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20'
                        : 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20'
                    }`}
                  >
                    <p className="font-medium text-slate-700 dark:text-slate-200 truncate">
                      {item.description}
                    </p>
                    <p
                      className={`font-bold ${item.type === 'expense' ? 'text-red-500' : 'text-emerald-500'}`}
                    >
                      {item.type === 'expense' ? '-' : '+'}₹{item.amount.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  },
  (prev, next) => {
    if (prev.day !== next.day) return false;
    if (prev.isToday !== next.isToday) return false;
    if (prev.date?.getTime() !== next.date?.getTime()) return false;
    if (prev.financialItems?.length !== next.financialItems?.length) return false;
    if (prev.tasks === next.tasks && prev.financialItems === next.financialItems) return true;
    if (prev.tasks.length !== next.tasks.length) return false;

    for (let i = 0; i < prev.tasks.length; i++) {
      const t1 = prev.tasks[i];
      const t2 = next.tasks[i];
      if (
        t1.id !== t2.id ||
        t1.title !== t2.title ||
        t1.priority !== t2.priority ||
        t1.type !== t2.type ||
        t1.status !== t2.status
      )
        return false;
    }

    return true;
  }
);

export default CalendarDayCell;
