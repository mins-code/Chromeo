/**
 * Budget Forecast Chart Component
 *
 * Displays a 30-day cash flow projection using recharts AreaChart.
 */

import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  TooltipProps,
} from 'recharts';
import { ForecastDataPoint, formatForecastDate } from '../utils/financialForecasting';

interface BudgetForecastChartProps {
  /** Array of forecast data points to display */
  data: ForecastDataPoint[];
  /** Currency formatting function */
  formatCurrency?: (value: number) => string;
}

/**
 * Custom tooltip component for the forecast chart.
 */
const CustomTooltip: React.FC<
  TooltipProps<number, string> & { formatCurrency?: (value: number) => string }
> = ({ active, payload, formatCurrency = (v) => `₹${v.toLocaleString('en-IN')}` }) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0].payload as ForecastDataPoint;
  const balance = data.balance;
  const isNegative = balance < 0;

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-xl p-3 shadow-lg min-w-[160px]">
      <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">
        {formatForecastDate(data.date)}
      </p>
      <p className={`text-lg font-bold ${isNegative ? 'text-red-500' : 'text-brand-500'}`}>
        {formatCurrency(balance)}
      </p>
      {data.label && (
        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-white/5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
            Transactions
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300">{data.label}</p>
        </div>
      )}
    </div>
  );
};

/**
 * Budget Forecast Chart displays a visual projection of future balance.
 *
 * Features:
 * - Area chart with gradient fill
 * - Zero reference line for debt threshold
 * - Custom tooltip with transaction details
 * - Dark mode support
 */
const BudgetForecastChart: React.FC<BudgetForecastChartProps> = ({
  data,
  formatCurrency = (v) =>
    v.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }),
}) => {
  // Calculate min/max for Y axis domain
  const { minBalance, maxBalance } = useMemo(() => {
    if (data.length === 0) return { minBalance: 0, maxBalance: 100 };

    const balances = data.map((d) => d.balance);
    const min = Math.min(...balances);
    const max = Math.max(...balances);

    // Add 10% padding
    const padding = (max - min) * 0.1 || 100;
    return {
      minBalance: Math.floor((min - padding) / 100) * 100,
      maxBalance: Math.ceil((max + padding) / 100) * 100,
    };
  }, [data]);

  // Format X-axis tick labels
  const formatXAxisTick = (dateString: string) => {
    return formatForecastDate(dateString);
  };

  // Format Y-axis tick labels
  const formatYAxisTick = (value: number) => {
    if (Math.abs(value) >= 100000) {
      return `₹${(value / 100000).toFixed(1)}L`;
    } else if (Math.abs(value) >= 1000) {
      return `₹${(value / 1000).toFixed(0)}K`;
    }
    return `₹${value}`;
  };

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400 dark:text-slate-500">
        <p className="text-sm">No recurring transactions to project</p>
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <defs>
            {/* Gradient for positive values */}
            <linearGradient id="forecastGradientPositive" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(34, 211, 238)" stopOpacity={0.4} />
              <stop offset="50%" stopColor="rgb(34, 211, 238)" stopOpacity={0.1} />
              <stop offset="100%" stopColor="rgb(34, 211, 238)" stopOpacity={0} />
            </linearGradient>
            {/* Gradient for mixed values (includes potential negative) */}
            <linearGradient id="forecastGradientMixed" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgb(34, 211, 238)" stopOpacity={0.4} />
              <stop offset="70%" stopColor="rgb(251, 146, 60)" stopOpacity={0.2} />
              <stop offset="100%" stopColor="rgb(239, 68, 68)" stopOpacity={0.3} />
            </linearGradient>
          </defs>

          <CartesianGrid
            strokeDasharray="3 3"
            stroke="currentColor"
            className="text-slate-200 dark:text-white/5"
            vertical={false}
          />

          <XAxis
            dataKey="date"
            tickFormatter={formatXAxisTick}
            stroke="currentColor"
            className="text-slate-400"
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={40}
          />

          <YAxis
            tickFormatter={formatYAxisTick}
            stroke="currentColor"
            className="text-slate-400"
            tick={{ fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            domain={[minBalance, maxBalance]}
            width={60}
          />

          <Tooltip
            content={<CustomTooltip formatCurrency={formatCurrency} />}
            cursor={{
              stroke: 'rgb(34, 211, 238)',
              strokeWidth: 1,
              strokeDasharray: '4 4',
            }}
          />

          {/* Zero reference line */}
          <ReferenceLine
            y={0}
            stroke="rgb(239, 68, 68)"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            label={{
              value: 'Debt',
              position: 'left',
              fill: 'rgb(239, 68, 68)',
              fontSize: 10,
              fontWeight: 'bold',
            }}
          />

          <Area
            type="monotone"
            dataKey="balance"
            stroke="rgb(34, 211, 238)"
            strokeWidth={2}
            fill={minBalance < 0 ? 'url(#forecastGradientMixed)' : 'url(#forecastGradientPositive)'}
            dot={false}
            activeDot={{
              r: 6,
              stroke: 'rgb(34, 211, 238)',
              strokeWidth: 2,
              fill: 'white',
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default React.memo(BudgetForecastChart);
