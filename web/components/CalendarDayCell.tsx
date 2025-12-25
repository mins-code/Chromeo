import React, { memo } from 'react';
import { Task, TaskPriority, ThemeOption } from '../types';

interface CalendarDayCellProps {
  day: number | null;
  date: Date | null;
  tasks: Task[];
  isToday: boolean;
  onClick: () => void;
  theme: ThemeOption;
}

const CalendarDayCell = memo(({ day, date, tasks, isToday, onClick, theme }: CalendarDayCellProps) => {
  return (
    <div
        onClick={onClick}
        className={`
            relative border rounded-xl p-2 flex flex-col transition-all cursor-pointer overflow-hidden theme-${theme}
            ${!day ? 'border-transparent cursor-default' : 'bg-surface border-border hover:border-primary/30 hover:shadow-lg'}
            ${isToday ? 'bg-primary/5 border-primary/30' : ''}
        `}
    >
        {day && (
            <>
                <span className={`text-sm font-semibold mb-1 ${isToday ? 'text-primary' : 'text-text-secondary'}`}>
                    {day}
                </span>
                <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                    {tasks.slice(0, 3).map(task => (
                        <div
                            key={task.id}
                            className={`
                                text-[10px] px-1.5 py-0.5 rounded truncate border-l-2
                                ${task.priority === TaskPriority.HIGH ? 'bg-danger/10 text-danger border-danger' :
                                  task.priority === TaskPriority.MEDIUM ? 'bg-warning/10 text-warning border-warning' :
                                  'bg-success/10 text-success border-success'}
                            `}
                        >
                            {task.title}
                        </div>
                    ))}
                    {tasks.length > 3 && (
                        <div className="text-[10px] text-text-secondary pl-1">
                            +{tasks.length - 3} more
                        </div>
                    )}
                </div>
            </>
        )}
    </div>
  );
}, (prev, next) => {
  if (prev.day !== next.day) return false;
  if (prev.isToday !== next.isToday) return false;
  if (prev.theme !== next.theme) return false;
  if (prev.date?.getTime() !== next.date?.getTime()) return false;
  if (prev.tasks === next.tasks) return true;
  if (prev.tasks.length !== next.tasks.length) return false;
  
  for (let i = 0; i < prev.tasks.length; i++) {
    const t1 = prev.tasks[i];
    const t2 = next.tasks[i];
    if (t1.id !== t2.id || t1.title !== t2.title || t1.priority !== t2.priority) return false;
  }
  return true;
});

export default CalendarDayCell;