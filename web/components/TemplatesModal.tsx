import React, { useEffect, useState } from 'react';
import { LayoutTemplate, Trash2, X } from 'lucide-react';
import Button from './Button';
import { DayPlanTemplate } from '../types';
import * as DayPlanService from '../services/dayPlanService';

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (template: DayPlanTemplate) => void;
}

const TemplatesModal: React.FC<TemplatesModalProps> = ({ isOpen, onClose, onApply }) => {
  const [templates, setTemplates] = useState<DayPlanTemplate[]>([]);

  useEffect(() => {
    if (isOpen) {
      setTemplates(DayPlanService.getTemplates());
    }
  }, [isOpen]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this template?')) {
      DayPlanService.deleteTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl border border-slate-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <LayoutTemplate className="text-brand-500" />
              Templates
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Select a template to apply to your day plan.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-500 dark:text-slate-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {templates.length === 0 ? (
            <div className="text-center py-12 flex flex-col items-center">
              <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4 text-slate-400">
                <LayoutTemplate size={32} />
              </div>
              <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100">
                No saved templates
              </h3>
              <p className="text-slate-500 dark:text-slate-400 max-w-xs mx-auto mt-2">
                Save your favorite day structures as templates to quickly reuse them.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => onApply(template)}
                  className="group relative p-4 bg-slate-50 dark:bg-black/20 rounded-xl border border-slate-200 dark:border-white/5 hover:border-brand-500/50 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-slate-800 dark:text-slate-100 flex-1 truncate pr-2">
                      {template.name}
                    </h3>
                    <button
                      onClick={(e) => handleDelete(template.id, e)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete template"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  {template.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-3 h-8">
                      {template.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-slate-400 border-t border-slate-200 dark:border-white/5 pt-3 mt-1">
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-slate-600 dark:text-slate-300">
                        {template.tasks.length}
                      </span>{' '}
                      tasks
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-slate-600 dark:text-slate-300">
                        {template.links.length}
                      </span>{' '}
                      links
                    </div>
                  </div>

                  <div className="absolute inset-0 border-2 border-brand-500 rounded-xl opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 pointer-events-none transition-all duration-200" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplatesModal;
