
import React, { useState, useEffect } from 'react';
import { Budget, Transaction, ThemeOption } from '../types';
import * as BudgetService from '../services/budgetService';
import Button from './Button';
import Input from './Input';
import { Wallet, TrendingUp, TrendingDown, Plus, Trash2, IndianRupee, Eye, EyeOff, Repeat, ArrowRight, Settings } from 'lucide-react';
import { t } from '../themeText';

interface BudgetPlannerProps {
    budget: Budget;
    onUpdate: (budget: Budget) => void;
    currentTheme: ThemeOption;
}

const BudgetPlanner: React.FC<BudgetPlannerProps> = ({ budget, onUpdate, currentTheme }) => {
    const [limitInput, setLimitInput] = useState('');
    const [durationInput, setDurationInput] = useState('Monthly');
    const [transDesc, setTransDesc] = useState('');
    const [transAmount, setTransAmount] = useState('');
    const [transType, setTransType] = useState<'income' | 'expense'>('expense');

    useEffect(() => {
        setLimitInput(budget.limit.toString());
        setDurationInput(budget.duration);
    }, [budget]);

    const handleUpdateSettings = async () => {
        const num = parseFloat(limitInput);
        if (!isNaN(num)) {
            const updatedBudget = await BudgetService.updateBudgetSettings(num, durationInput);
            onUpdate(updatedBudget);
        }
    };

    const handleAddTransaction = async () => {
        const amount = parseFloat(transAmount);
        if (transDesc && !isNaN(amount) && amount > 0) {
            const updatedBudget = await BudgetService.addTransaction(transDesc, amount, transType);
            onUpdate(updatedBudget);
            setTransDesc('');
            setTransAmount('');
        }
    };

    const totalIncome = budget.transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
    const totalExpenses = budget.transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
    const remaining = budget.limit - totalExpenses;

    const formatCurrency = (val: number) => {
        return val.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
    };

    return (
        <div className="space-y-8 animate-fade-in h-full flex flex-col">
            <header className="border-b border-slate-200 dark:border-white/5 pb-6">
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-3">
                    <Wallet className="text-brand-500" /> {t(currentTheme, 'budgetPlanner')}
                </h2>
                <p className="text-slate-500 dark:text-slate-400">Track your {t(currentTheme, 'income').toLowerCase()}, expenses, and savings goals.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Summary Card */}
                <div className="lg:col-span-2 glass-panel p-8 rounded-3xl relative overflow-hidden flex flex-col justify-center min-h-[220px]">
                    <div className="absolute right-0 bottom-0 opacity-10 translate-x-1/4 translate-y-1/4">
                        <IndianRupee size={240} className="text-brand-500" />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 relative z-10">
                        <div>
                            <p className="text-[10px] font-bold uppercase text-slate-400 mb-1 tracking-widest font-mono">{t(currentTheme, 'totalBudget')}</p>
                            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{formatCurrency(budget.limit)}</p>
                            <p className="text-[10px] text-slate-500 font-mono">/ {budget.duration}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase text-slate-400 mb-1 tracking-widest font-mono">Expenses</p>
                            <p className="text-2xl font-bold text-red-500">{formatCurrency(totalExpenses)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase text-slate-400 mb-1 tracking-widest font-mono">{t(currentTheme, 'remaining')}</p>
                            <p className="text-2xl font-bold text-brand-500">{formatCurrency(remaining)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase text-slate-400 mb-1 tracking-widest font-mono">{t(currentTheme, 'income')}</p>
                            <p className="text-2xl font-bold text-emerald-500">{formatCurrency(totalIncome)}</p>
                        </div>
                    </div>

                    <div className="mt-8 h-2 w-full bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 ${remaining < 0 ? 'bg-red-500' : 'bg-brand-500'}`}
                            style={{ width: `${Math.min(100, (totalExpenses / (budget.limit || 1)) * 100)}%` }}
                        />
                    </div>
                </div>

                {/* Settings Card */}
                <div className="glass-panel p-6 rounded-3xl space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2 font-mono">
                        <Settings size={14} /> Budget Settings
                    </h3>
                    <div className="space-y-4">
                        <Input
                            label="Total Limit"
                            type="number"
                            value={limitInput}
                            onChange={e => setLimitInput(e.target.value)}
                        />
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase text-slate-400 ml-1 font-mono">Duration</label>
                            <select
                                value={durationInput}
                                onChange={e => setDurationInput(e.target.value)}
                                className="w-full bg-white dark:bg-black/30 border border-slate-300 dark:border-white/10 rounded-xl px-4 h-11 text-sm text-slate-800 dark:text-slate-100 focus:outline-none"
                            >
                                <option>Daily</option>
                                <option>Weekly</option>
                                <option>Monthly</option>
                                <option>Yearly</option>
                            </select>
                        </div>
                        <Button variant="primary" className="w-full" onClick={handleUpdateSettings}>Update Budget</Button>
                    </div>
                </div>
            </div>

            {/* Quick Transaction */}
            <div className="glass-panel p-6 rounded-3xl grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="md:col-span-2">
                    <Input label="Description" value={transDesc} onChange={e => setTransDesc(e.target.value)} placeholder="E.g. Coffee" />
                </div>
                <div>
                    <Input label="Amount" type="number" value={transAmount} onChange={e => setTransAmount(e.target.value)} placeholder="0.00" />
                </div>
                <div className="flex gap-2">
                    <Button variant="primary" className="flex-1" onClick={handleAddTransaction}>Log</Button>
                    <Button
                        variant="secondary"
                        className={`w-12 px-0 ${transType === 'income' ? 'text-emerald-500' : 'text-slate-400'}`}
                        onClick={() => setTransType(prev => prev === 'expense' ? 'income' : 'expense')}
                    >
                        {transType === 'expense' ? '-' : '+'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default BudgetPlanner;
