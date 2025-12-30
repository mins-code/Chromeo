import React from 'react';
import { Routine } from '../types';
import { Plus, Repeat, Clock, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import * as RoutineService from '../services/routineService';
import Button from './Button';

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
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your recurring activities and habits
          </p>
        </div>
        <Button variant="primary" onClick={onCreate} className="shadow-lg shadow-emerald-500/25 bg-emerald-500 hover:bg-emerald-600">
          <Plus size={18} className="mr-2" />
          Add Routine
        </Button>
      </div>

      {/* Routines Grid */}
      {routines.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {routines.map(routine => (
            <div 
              key={routine.id}
              className={`group relative bg-white/60 dark:bg-dark-surface/50 backdrop-blur-sm border rounded-2xl p-5 transition-all hover:shadow-lg ${
                routine.isActive 
                  ? 'border-emerald-200 dark:border-emerald-500/30' 
                  : 'border-slate-200 dark:border-white/5 opacity-60'
              }`}
            >
              {/* Status indicator */}
              <div className={`absolute top-4 right-4 w-2 h-2 rounded-full ${routine.isActive ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              
              {/* Content */}
              <div className="flex items-start gap-3 mb-3">
                <div className={`p-2 rounded-xl ${routine.isActive ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-slate-100 dark:bg-slate-800'}`}>
                  <Repeat size={20} className={routine.isActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500'} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate">{routine.name}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    {RoutineService.getPatternDescription(routine.pattern)}
                  </p>
                </div>
              </div>

              {/* Time */}
              {routine.time && (
                <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-4">
                  <Clock size={14} />
                  <span>{routine.time}</span>
                  {routine.duration && <span className="text-slate-400">• {routine.duration} min</span>}
                </div>
              )}

              {/* Cycle Preview (for cycle patterns) */}
              {routine.pattern.type === 'cycle' && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {routine.pattern.items.slice(0, 4).map((item, idx) => (
                    <span 
                      key={idx}
                      className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: item.color || '#6B7280' }}
                    >
                      {item.name}
                    </span>
                  ))}
                  {routine.pattern.items.length > 4 && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      +{routine.pattern.items.length - 4}
                    </span>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-white/5">
                <button
                  onClick={() => onToggle(routine.id)}
                  className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
                    routine.isActive 
                      ? 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700' 
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  {routine.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                  {routine.isActive ? 'Active' : 'Inactive'}
                </button>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => onEdit(routine)}
                    className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => onDelete(routine.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-16 bg-white/40 dark:bg-dark-surface/30 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Repeat size={32} className="text-emerald-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">No Routines Yet</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-sm mx-auto">
            Create routines for recurring activities like workout schedules, work hours, or daily habits.
          </p>
          <Button variant="primary" onClick={onCreate} className="shadow-lg shadow-emerald-500/25 bg-emerald-500 hover:bg-emerald-600">
            <Plus size={18} className="mr-2" />
            Create Your First Routine
          </Button>
        </div>
      )}

      {/* Today's Routines Preview */}
      {routines.length > 0 && (
        <div className="bg-white/40 dark:bg-dark-surface/30 rounded-2xl p-6 border border-slate-200 dark:border-white/5">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">Today's Routines</h3>
          <TodayRoutinesPreview />
        </div>
      )}
    </div>
  );
};

// Today's routines preview component
const TodayRoutinesPreview: React.FC = () => {
  const todayRoutines = RoutineService.getRoutinesForDate(new Date());
  
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
};

export default RoutineList;
