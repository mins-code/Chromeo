import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { Task, TaskStatus, ViewMode, ThemeOption } from '../types';

interface StatsProps {
  tasks: Task[];
  onNavigate?: (view: ViewMode) => void;
  theme: ThemeOption;
}

const Stats: React.FC<StatsProps> = ({ tasks, onNavigate, theme }) => {
  // Theme-aware colors for charts
  const colors = useMemo(() => {
    // Default/Light theme map, override for others if needed
    const map = {
        todo: '#94A3B8', // text-secondary
        inProgress: '#3B82F6', // primary
        done: '#10B981', // success
        low: '#3B82F6',
        medium: '#F59E0B',
        high: '#EF4444',
        text: theme === 'dark' || theme === 'cyberpunk' ? '#F1F5F9' : '#111827',
        bg: theme === 'dark' ? '#1E293B' : '#FFFFFF'
    };
    
    if (theme === 'sunset') {
        map.inProgress = '#F59E0B';
        map.done = '#10B981';
    } else if (theme === 'cyberpunk') {
        map.inProgress = '#06B6D4';
        map.done = '#10B981';
    }
    return map;
  }, [theme]);

  const statusData = useMemo(() => {
    const counts = { [TaskStatus.TODO]: 0, [TaskStatus.IN_PROGRESS]: 0, [TaskStatus.DONE]: 0 };
    tasks.forEach(t => counts[t.status]++);
    return [
      { name: 'Todo', value: counts[TaskStatus.TODO], color: colors.todo },
      { name: 'In Progress', value: counts[TaskStatus.IN_PROGRESS], color: colors.inProgress },
      { name: 'Done', value: counts[TaskStatus.DONE], color: colors.done },
    ].filter(d => d.value > 0);
  }, [tasks, colors]);

  const priorityData = useMemo(() => {
      const counts = { LOW: 0, MEDIUM: 0, HIGH: 0 };
      tasks.forEach(t => counts[t.priority]++);
      return [
          { name: 'Low', count: counts.LOW, color: colors.low },
          { name: 'Medium', count: counts.MEDIUM, color: colors.medium },
          { name: 'High', count: counts.HIGH, color: colors.high },
      ];
  }, [tasks, colors]);

  const completionRate = useMemo(() => {
    if (tasks.length === 0) return 0;
    const done = tasks.filter(t => t.status === TaskStatus.DONE).length;
    return Math.round((done / tasks.length) * 100);
  }, [tasks]);

  return (
    <div className={`space-y-6 animate-fade-in theme-${theme}`}>
        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-6">
            <div 
                onClick={() => onNavigate && onNavigate('tasks')}
                className="bg-surface border border-border p-6 rounded-2xl relative overflow-hidden group hover:border-primary/30 transition-all cursor-pointer hover:shadow-lg active:scale-[0.99]"
            >
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" className="text-text"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                </div>
                <h3 className="text-text-secondary text-xs uppercase font-bold tracking-widest mb-2 group-hover:text-primary transition-colors">Total Tasks</h3>
                <p className="text-4xl font-bold text-text tracking-tight">{tasks.length}</p>
                <p className="text-xs text-text-secondary mt-1 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    View all items &rarr;
                </p>
            </div>
            <div className="bg-surface border border-border p-6 rounded-2xl relative overflow-hidden group hover:border-primary/30 transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                     <svg width="64" height="64" viewBox="0 0 24 24" fill="currentColor" className="text-primary"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                </div>
                <h3 className="text-text-secondary text-xs uppercase font-bold tracking-widest mb-2">Completion Rate</h3>
                <p className="text-4xl font-bold text-primary tracking-tight">{completionRate}%</p>
            </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-surface border border-border p-6 rounded-2xl h-[340px] flex flex-col">
                <h3 className="font-semibold text-text mb-6">Task Status Distribution</h3>
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
                                contentStyle={{ backgroundColor: colors.bg, borderColor: colors.todo, color: colors.text, borderRadius: '8px' }}
                                itemStyle={{ color: colors.text }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                <div className="flex justify-center gap-6 mt-4">
                    {statusData.map(d => (
                        <div key={d.name} className="flex items-center gap-2 text-xs font-medium text-text-secondary">
                            <div className="w-2.5 h-2.5 rounded-full" style={{background: d.color}} />
                            {d.name}
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-surface border border-border p-6 rounded-2xl h-[340px] flex flex-col">
                <h3 className="font-semibold text-text mb-6">Workload by Priority</h3>
                <div className="flex-1 w-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={priorityData}>
                            <XAxis dataKey="name" stroke={colors.todo} fontSize={12} tickLine={false} axisLine={false} dy={10} />
                            <YAxis stroke={colors.todo} fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip
                                cursor={{fill: 'rgba(255,255,255,0.05)'}}
                                contentStyle={{ backgroundColor: colors.bg, borderColor: colors.todo, color: colors.text, borderRadius: '8px' }}
                            />
                            <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={48}>
                                {priorityData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
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