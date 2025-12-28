import React, { memo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { format } from 'date-fns';
import { Task } from '../types';
import DraggableTask, { TYPE_COLORS } from './DraggableTask';

interface CalendarDayCellProps {
  day: number | null;
  date: Date | null;
  tasks: Task[];
  isToday: boolean;
  onClick: () => void;
}

const CalendarDayCell = memo(({ day, date, tasks, isToday, onClick }: CalendarDayCellProps) => {
  const droppableId = date ? format(date, 'yyyy-MM-dd') : `empty-${day}`;
  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: { date },
    disabled: !date,
  });

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
          <span className={`text-sm font-semibold mb-1 ${isToday ? 'text-brand-500' : 'text-slate-400'}`}>
            {day}
          </span>
          <div className="flex-1 flex flex-col gap-1 overflow-hidden">
            {tasks.slice(0, 3).map(task => (
              <DraggableTask key={task.id} task={task} variant="chip" />
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
  if (prev.day !== next.day) return false;
  if (prev.isToday !== next.isToday) return false;
  if (prev.date?.getTime() !== next.date?.getTime()) return false;
  if (prev.tasks === next.tasks) return true;
  if (prev.tasks.length !== next.tasks.length) return false;

  for (let i = 0; i < prev.tasks.length; i++) {
    const t1 = prev.tasks[i];
    const t2 = next.tasks[i];
    if (t1.id !== t2.id || t1.title !== t2.title || t1.priority !== t2.priority || t1.type !== t2.type) return false;
  }

  return true;
});

export default CalendarDayCell;
