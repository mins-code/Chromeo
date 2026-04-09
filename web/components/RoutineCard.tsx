import React from 'react';
import { Routine } from '../types';
import { Repeat, Clock, Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import * as RoutineService from '../services/routineService';

interface RoutineCardProps {
  routine: Routine;
  onEdit: (routine: Routine) => void;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}

const RoutineCard: React.FC<RoutineCardProps> = ({ routine, onEdit, onDelete, onToggle }) => {
  return (
    <div
      className={`group relative glass-panel rounded-2xl p-5 transition-all hover:shadow-lg ${
        routine.isActive
          ? 'border-brand-200 dark:border-brand-500/30'
          : 'border-slate-200 dark:border-white/5 opacity-60'
      }`}
    >
      {/* Status indicator */}
      <div
        className={`absolute top-4 right-4 w-2 h-2 rounded-full ${routine.isActive ? 'bg-brand-500' : 'bg-slate-400'}`}
      />

      {/* Content */}
      <div className="flex items-start gap-3 mb-3">
        <div
          className={`p-2 rounded-xl ${routine.isActive ? 'bg-brand-100 dark:bg-brand-900/30' : 'bg-slate-100 dark:bg-slate-800'}`}
        >
          <Repeat
            size={20}
            className={routine.isActive ? 'text-brand-600 dark:text-brand-400' : 'text-slate-500'}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-slate-800 dark:text-slate-100 truncate">
            {routine.name}
          </h3>
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
          className={`flex items-center gap-1.5 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 rounded-md px-1 ${
            routine.isActive
              ? 'text-brand-600 dark:text-brand-400 hover:text-brand-700'
              : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
          aria-pressed={routine.isActive}
          aria-label={`Toggle routine: ${routine.name}`}
        >
          {routine.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
          {routine.isActive ? 'Active' : 'Inactive'}
        </button>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(routine)}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors"
            title="Edit"
            aria-label={`Edit routine: ${routine.name}`}
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => onDelete(routine.id)}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Delete"
            aria-label={`Delete routine: ${routine.name}`}
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(RoutineCard);
