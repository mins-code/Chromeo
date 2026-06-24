
import React, { useMemo } from 'react';
import { Task, TaskStatus, TaskPriority, ViewMode, Budget } from '../types';
import { Wallet, CheckSquare, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface StatsProps {
  tasks: Task[];
  budget?: Budget;
  onNavigate?: (view: ViewMode) => void;
}

const Stats: React.FC<StatsProps> = ({ tasks, budget, onNavigate }) => {
  // Filter tasks for today only
  const todaysTasks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return tasks.filter(t => {
      const taskDate = t.dueDate || t.reminderTime;
      if (!taskDate) return false;
      const date = new Date(taskDate);
      return date >= today && date < tomorrow;
    });
  }, [tasks]);

  // Today's stats
  const todayStats = useMemo(() => {
    const todo = todaysTasks.filter(t => t.status === TaskStatus.TODO).length;
    const inProgress = todaysTasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length;
    const done = todaysTasks.filter(t => t.status === TaskStatus.DONE).length;
    const total = todaysTasks.length;
    
    const lowPriority = todaysTasks.filter(t => t.priority === TaskPriority.LOW && t.status !== TaskStatus.DONE).length;
    const mediumPriority = todaysTasks.filter(t => t.priority === TaskPriority.MEDIUM && t.status !== TaskStatus.DONE).length;
    const highPriority = todaysTasks.filter(t => t.priority === TaskPriority.HIGH && t.status !== TaskStatus.DONE).length;

    return { todo, inProgress, done, total, lowPriority, mediumPriority, highPriority };
  }, [todaysTasks]);

  // Daily Safe Spend Calculation
  const dailySafeSpend = useMemo(() => {
    if (!budget || budget.limit === 0) return null;
    
    const totalExpenses = budget.transactions.reduce(
      (acc, curr) => (curr.type === 'expense' ? acc + curr.amount : acc),
      0
    );
    
    const remaining = budget.limit - totalExpenses;
    
    // Calculate days remaining in the month
    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const daysRemaining = Math.max(1, lastDayOfMonth.getDate() - now.getDate() + 1);
    
    const dailyAmount = remaining / daysRemaining;
    
    return {
      amount: dailyAmount,
      daysRemaining,
      remaining,
      isHealthy: dailyAmount > 0
    };
  }, [budget]);

  return (
    <div className="space-y-6 animate-fade-in">
        {/* Today's Overview Header */}
        <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">Today's Overview</h3>
            <span className="text-xs text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-full">
                {todayStats.total} total
            </span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Todo */}
            <div 
                onClick={() => onNavigate && onNavigate('tasks')}
                className="glass-panel border border-slate-200 dark:border-white/5 p-5 rounded-2xl relative overflow-hidden group hover:border-slate-400/50 transition-all cursor-pointer"
            >
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-slate-500/10">
                        <Clock size={18} className="text-slate-500" />
                    </div>
                </div>
                <p className="text-3xl font-bold text-slate-700 dark:text-slate-100">{todayStats.todo}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">To Do</p>
            </div>

            {/* In Progress */}
            <div 
                onClick={() => onNavigate && onNavigate('tasks')}
                className="glass-panel border border-slate-200 dark:border-white/5 p-5 rounded-2xl relative overflow-hidden group hover:border-brand-500/30 transition-all cursor-pointer"
            >
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-brand-500/10">
                        <CheckSquare size={18} className="text-brand-500" />
                    </div>
                </div>
                <p className="text-3xl font-bold text-brand-500">{todayStats.inProgress}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">In Progress</p>
            </div>

            {/* Completed */}
            <div 
                onClick={() => onNavigate && onNavigate('tasks')}
                className="glass-panel border border-slate-200 dark:border-white/5 p-5 rounded-2xl relative overflow-hidden group hover:border-emerald-500/30 transition-all cursor-pointer"
            >
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-emerald-500/10">
                        <CheckCircle2 size={18} className="text-emerald-500" />
                    </div>
                </div>
                <p className="text-3xl font-bold text-emerald-500">{todayStats.done}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">Completed</p>
            </div>

            {/* High Priority */}
            <div 
                onClick={() => onNavigate && onNavigate('tasks')}
                className="glass-panel border border-slate-200 dark:border-white/5 p-5 rounded-2xl relative overflow-hidden group hover:border-red-500/30 transition-all cursor-pointer"
            >
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-lg bg-red-500/10">
                        <AlertTriangle size={18} className="text-red-500" />
                    </div>
                </div>
                <p className="text-3xl font-bold text-red-500">{todayStats.highPriority}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">High Priority</p>
            </div>
        </div>

        {/* Budget Card - Full Width */}
        {dailySafeSpend && (
            <div 
                onClick={() => onNavigate && onNavigate('budget')}
                className="glass-panel border border-slate-200 dark:border-white/5 p-5 rounded-2xl relative overflow-hidden group hover:border-emerald-500/30 transition-all cursor-pointer"
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${dailySafeSpend.isHealthy ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                            <Wallet size={24} className={dailySafeSpend.isHealthy ? 'text-emerald-500' : 'text-red-500'} />
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider mb-1">
                                Daily Safe Spend
                            </p>
                            <p className={`text-3xl font-bold ${dailySafeSpend.isHealthy ? 'text-emerald-500' : 'text-red-500'}`}>
                                ₹{Math.abs(dailySafeSpend.amount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                            </p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                            {dailySafeSpend.daysRemaining} days left
                        </p>
                        <p className="text-xs text-slate-400">
                            ₹{dailySafeSpend.remaining.toLocaleString('en-IN', { maximumFractionDigits: 0 })} remaining
                        </p>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};

export default Stats;

