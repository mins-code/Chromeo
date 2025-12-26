
import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { Task, TaskStatus, ViewMode } from '../types';

interface StatsProps {
  tasks: Task[];
  onNavigate?: (view: ViewMode) => void;
}

const Stats: React.FC<StatsProps> = ({ tasks, onNavigate }) => {
  const statusData = useMemo(() => {
    const counts = {
      [TaskStatus.TODO]: 0,
      [TaskStatus.IN_PROGRESS]: 0,
      [TaskStatus.DONE]: 0,
    };
    tasks.forEach(t => counts[t.status]++);
    return [
      { name: 'Todo', value: counts[TaskStatus.TODO], color: '#94a3b8' },
      { name: 'In Progress', value: counts[TaskStatus.IN_PROGRESS], color: '#0ea5e9' },
      { name: 'Done', value: counts[TaskStatus.DONE], color: '#10b981' },
    ].filter(d => d.value > 0);
  }, [tasks]);

  const priorityData = useMemo(() => {
      const counts = { LOW: 0, MEDIUM: 0, HIGH: 0 };
      tasks.forEach(t => counts[t.priority]++);
      return [
          { name: 'Low', count: counts.LOW },
          { name: 'Medium', count: counts.MEDIUM },
          { name: 'High', count: counts.HIGH },
      ];
  }, [tasks]);

  const completionRate = useMemo(() => {
    if (tasks.length === 0) return 0;
    const done = tasks.filter(t => t.status === TaskStatus.DONE).length;
    return Math.round((done / tasks.length) * 100);
  }, [tasks]);

  return (
    <div className="space-y-6 animate-fade-in">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-6">
            <div 
                onClick={() => onNavigate && onNavigate('tasks')}
                className="glass-panel border border-slate-200 dark:border-white/5 p-6 rounded-2xl relative overflow-hidden group hover:border-brand-500/30 transition-all cursor-pointer hover:shadow-lg active:scale-[0.99]"
            >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" className="text-slate-800 dark:text-white"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                </div>
                <h3 className="text-slate-500 dark:text-slate-400 text-xs uppercase font-bold tracking-widest mb-2 group-hover:text-brand-500 transition-colors">Total Tasks</h3>
                <p className="text-4xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">{tasks.length}</p>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    View all items &rarr;
                </p>
            </div>
            <div className="glass-panel border border-slate-200 dark:border-white/5 p-6 rounded-2xl relative overflow-hidden group hover:border-brand-500/30 transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                     <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" className="text-brand-500"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                </div>
                <h3 className="text-slate-500 dark:text-slate-400 text-xs uppercase font-bold tracking-widest mb-2">Completion Rate</h3>
                <p className="text-4xl font-bold text-brand-500 tracking-tight">{completionRate}%</p>
            </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Status Pie */}
            <div className="glass-panel border border-slate-200 dark:border-white/5 p-6 rounded-2xl h-[340px] flex flex-col">
                <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-6">Task Status Distribution</h3>
                <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={statusData}
                                innerRadius={70}
                                outerRadius={90}
                                paddingAngle={5}
                                dataKey="value"
                                cornerRadius={4}
                            >
                                {statusData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.9)', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                itemStyle={{ color: '#f8fafc' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-4">
                    {statusData.map(d => (
                        <div key={d.name} className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                            <div className="w-2.5 h-2.5 rounded-full" style={{background: d.color}} />
                            {d.name}
                        </div>
                    ))}
                </div>
            </div>

            {/* Priority Bar */}
            <div className="glass-panel border border-slate-200 dark:border-white/5 p-6 rounded-2xl h-[340px] flex flex-col">
                <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-6">Workload by Priority</h3>
                <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={priorityData}>
                            <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                            <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip
                                cursor={{fill: 'rgba(255,255,255,0.05)'}}
                                contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.9)', borderColor: '#334155', color: '#f8fafc', borderRadius: '8px' }}
                            />
                            <Bar dataKey="count" fill="#38bdf8" radius={[6, 6, 0, 0]} barSize={48}>
                                {priorityData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={index === 2 ? '#ef4444' : index === 1 ? '#eab308' : '#38bdf8'} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    </div>
  );
};

export default Stats;
