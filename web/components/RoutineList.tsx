import React, { useMemo } from 'react';
import { Routine } from '../types';
import { Plus, Repeat } from 'lucide-react';
import * as RoutineService from '../services/routineService';
import Button from './Button';
import RoutineCard from './RoutineCard';

interface RoutineListProps {
  routines: Routine[];
  onEdit: (routine: Routine) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
  onCreate: () => void;
}

const RoutineList: React.FC<RoutineListProps> = ({ routines, onEdit, onDelete, onToggle, onCreate }) => {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Routines</h2>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            Manage your recurring activities and habits
          </p>
        </div>
        <Button variant="primary" onClick={onCreate}>
          <Plus size={18} className="mr-2" />
          Add Routine
        </Button>
      </div>

      {/* Routines Grid */}
      {routines.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {routines.map(routine => (
            <RoutineCard
              key={routine.id}
              routine={routine}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggle={onToggle}
            />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-16 glass-panel rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
          <div className="w-16 h-16 bg-brand-500/10 dark:bg-brand-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Repeat size={32} className="text-brand-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">No Routines Yet</h3>
          <p className="text-slate-600 dark:text-slate-300 mb-6 max-w-sm mx-auto">
            Create routines for recurring activities like workout schedules, work hours, or daily habits.
          </p>
          <Button 
            variant="primary" 
            onClick={onCreate}
          >
            <Plus size={18} className="mr-2" />
            Create Your First Routine
          </Button>
        </div>
      )}

      {/* Today's Routines Preview */}
      {routines.length > 0 && (
        <div className="glass-panel rounded-2xl p-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 mb-4">Today's Routines</h3>
          <TodayRoutinesPreview routines={routines} />
        </div>
      )}
    </div>
  );
};

// Today's routines preview component
interface TodayRoutinesPreviewProps {
  routines: Routine[];
}

const TodayRoutinesPreview: React.FC<TodayRoutinesPreviewProps> = React.memo(({ routines }) => {
  const todayRoutines = useMemo(() => {
    return RoutineService.getRoutinesForDate(new Date(), routines);
  }, [routines]);
  
  if (todayRoutines.length === 0) {
    return <p className="text-slate-500 dark:text-slate-400 text-sm">No routines scheduled for today.</p>;
  }
  
  return (
    <div className="flex flex-wrap gap-3">
      {todayRoutines.map((r, idx) => (
        <div 
          key={idx}
          className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-black/20 rounded-xl border border-slate-200 dark:border-white/5"
        >
          <div 
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: r.color || '#10B981' }}
          />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{r.displayName}</span>
          {r.routine.time && (
            <span className="text-xs text-slate-500">@ {r.routine.time}</span>
          )}
        </div>
      ))}
    </div>
  );
});

export default React.memo(RoutineList);
