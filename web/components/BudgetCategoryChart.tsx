/**
 * Budget Category Chart Component
 * 
 * Displays spending breakdown by category using recharts PieChart.
 */

import React, { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  TooltipProps
} from 'recharts';
import { Transaction } from '../types';

interface BudgetCategoryChartProps {
  /** Array of transactions to aggregate */
  transactions: Transaction[];
  /** Currency formatting function */
  formatCurrency?: (value: number) => string;
}

// Professional color palette for categories
const CATEGORY_COLORS: Record<string, string> = {
  'Food & Dining': '#ef4444',      // Red
  'Transportation': '#f97316',     // Orange
  'Shopping': '#eab308',           // Yellow
  'Utilities': '#22c55e',          // Green
  'Entertainment': '#06b6d4',      // Cyan
  'Health': '#3b82f6',             // Blue
  'Travel': '#8b5cf6',             // Purple
  'Income': '#10b981',             // Emerald
  'Other': '#6b7280',              // Gray
  'Uncategorized': '#94a3b8',      // Slate
};

interface CategoryData {
  name: string;
  value: number;
  color: string;
  percentage: number;
}

/**
 * Custom tooltip component for the pie chart.
 */
const CustomTooltip: React.FC<TooltipProps<number, string> & { formatCurrency?: (value: number) => string }> = ({
  active,
  payload,
  formatCurrency = (v) => `₹${v.toLocaleString('en-IN')}`
}) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0].payload as CategoryData;

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl p-3 shadow-lg min-w-[140px]">
      <div className="flex items-center gap-2 mb-1">
        <div 
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: data.color }}
        />
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          {data.name}
        </p>
      </div>
      <p className="text-lg font-bold text-slate-700 dark:text-slate-300">
        {formatCurrency(data.value)}
      </p>
      <p className="text-xs text-slate-500 mt-1">
        {data.percentage.toFixed(1)}% of total
      </p>
    </div>
  );
};

/**
 * Custom legend renderer for better styling
 */
const CustomLegend: React.FC<{ payload?: any[] }> = ({ payload }) => {
  if (!payload) return null;

  return (
    <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-4">
      {payload.map((entry, index) => (
        <div key={`legend-${index}`} className="flex items-center gap-1.5">
          <div 
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-slate-600 dark:text-slate-400">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

/**
 * Budget Category Chart displays spending breakdown by category.
 * 
 * Features:
 * - Pie chart with smooth animations
 * - Professional color palette
 * - Custom tooltip with percentage
 * - Responsive legend
 * - Dark mode support
 */
const BudgetCategoryChart: React.FC<BudgetCategoryChartProps> = ({
  transactions,
  formatCurrency = (v) => v.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })
}) => {
  // Aggregate transactions by category (expenses only)
  const categoryData = useMemo<CategoryData[]>(() => {
    const categoryTotals: Record<string, number> = {};
    
    // Sum up expenses by category
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const category = t.category || 'Uncategorized';
        categoryTotals[category] = (categoryTotals[category] || 0) + t.amount;
      });

    // Calculate total for percentages
    const total = Object.values(categoryTotals).reduce((sum, val) => sum + val, 0);
    
    if (total === 0) return [];

    // Convert to array and sort by value
    return Object.entries(categoryTotals)
      .map(([name, value]) => ({
        name,
        value,
        color: CATEGORY_COLORS[name] || CATEGORY_COLORS['Other'],
        percentage: (value / total) * 100
      }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  if (categoryData.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 dark:text-slate-500">
        <p className="text-sm">No expense data to display</p>
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={categoryData}
            cx="50%"
            cy="45%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            animationBegin={0}
            animationDuration={500}
          >
            {categoryData.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={entry.color}
                stroke="transparent"
              />
            ))}
          </Pie>
          <Tooltip 
            content={<CustomTooltip formatCurrency={formatCurrency} />}
          />
          <Legend 
            content={<CustomLegend />}
            verticalAlign="bottom"
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default React.memo(BudgetCategoryChart);
