import React, { memo } from 'react';
import { Task, TaskPriority } from '../types';

interface CalendarDayCellProps {
  day: number | null;
  date: Date | null;
  tasks: Task[];
  isToday: boolean;
  onClick: () => void;
}

const CalendarDayCell = memo(({ day, date, tasks, isToday, onClick }: CalendarDayCellProps) => {
  return (
    <div
        onClick={onClick}
        className={`
            relative border rounded-xl p-2 flex flex-col transition-all cursor-pointer overflow-hidden
            ${!day ? 'border-transparent cursor-default' : 'glass border-slate-200 dark:border-white/5 hover:border-brand-500/30 hover:shadow-lg'}
            ${isToday ? 'bg-brand-500/5 border-brand-500/30' : ''}
        `}
    >
        {day && (
            <>
                <span className={`text-sm font-semibold mb-1 ${isToday ? 'text-brand-500' : 'text-slate-400'}`}>
                    {day}
                </span>
                <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                    {tasks.slice(0, 3).map(task => (
                        <div
                            key={task.id}
                            className={`
                                text-[10px] px-1.5 py-0.5 rounded truncate border-l-2
                                ${task.priority === TaskPriority.HIGH ? 'bg-red-500/10 text-red-500 border-red-500' :
                                  task.priority === TaskPriority.MEDIUM ? 'bg-yellow-500/10 text-yellow-600 border-yellow-500' :
                                  'bg-green-500/10 text-green-600 border-green-500'}
                            `}
                        >
                            {task.title}
                        </div>
                    ))}
                    {tasks.length > 3 && (
                        <div className="text-[10px] text-slate-500 pl-1">
                            +{tasks.length - 3} more
                        </div>
                    )}
                </div>
            </>
        )}
    </div>
  );
}, (prev, next) => {
  // 1. Simple Primitive Checks
  if (prev.day !== next.day) return false;
  if (prev.isToday !== next.isToday) return false;

  // Date check (nullable)
  if (prev.date?.getTime() !== next.date?.getTime()) return false;

  // 2. Tasks Array Check
  // If reference is same, it's the same (unlikely with .filter, but good to check)
  if (prev.tasks === next.tasks) return true;

  // Length check
  if (prev.tasks.length !== next.tasks.length) return false;

  // 3. Task Signature Check
  // We only render: ID (key), Priority (color), Title (text)
  // If these haven't changed, the visual output is the same.
  for (let i = 0; i < prev.tasks.length; i++) {
    const t1 = prev.tasks[i];
    const t2 = next.tasks[i];

    if (t1.id !== t2.id) return false;
    if (t1.title !== t2.title) return false;
    if (t1.priority !== t2.priority) return false;
  }

  return true;
});

export default CalendarDayCell;
