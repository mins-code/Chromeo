import React, { useState, useEffect } from 'react';
import { Budget, ThemeOption } from '../types';
import * as BudgetService from '../services/budgetService';
import Button from './Button';
import Input from './Input';
import { Wallet, Settings, IndianRupee } from 'lucide-react';

interface BudgetPlannerProps {
    budget: Budget;
    onUpdate: (budget: Budget) => void;
    theme: ThemeOption;
}

const BudgetPlanner: React.FC<BudgetPlannerProps> = ({ budget, onUpdate, theme }) => {
    const [limitInput, setLimitInput] = useState('');
    const [durationInput, setDurationInput] = useState('Monthly');
    const [transDesc, setTransDesc] = useState('');
    const [transAmount, setTransAmount] = useState('');
    const [transType, setTransType] = useState<'income' | 'expense'>('expense');

    useEffect(() => {
        setLimitInput(budget.limit.toString());
        setDurationInput(budget.duration);
    }, [budget]);

    const handleUpdateSettings = () => {
        const num = parseFloat(limitInput);
        if (!isNaN(num)) onUpdate(BudgetService.updateBudgetSettings(num, durationInput));
    };

    const handleAddTransaction = () => {
        const amount = parseFloat(transAmount);
        if (transDesc && !isNaN(amount) && amount > 0) {
            onUpdate(BudgetService.addTransaction(transDesc, amount, transType));
            setTransDesc('');
            setTransAmount('');
        }
    };

    const totalIncome = budget.transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
    const totalExpenses = budget.transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
    const remaining = budget.limit - totalExpenses;

    const formatCurrency = (val: number) => val.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

    return (
        <div className={`space-y-8 animate-fade-in h-full flex flex-col theme-${theme}`}>
            <header className="border-b border-border pb-6">
                <h2 className="text-3xl font-bold text-text mb-2 flex items-center gap-3">
                    <Wallet className="text-primary" /> Budget Planner
                </h2>
                <p className="text-text-secondary">Track your income, expenses, and savings goals.</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-surface border border-border p-8 rounded-3xl relative overflow-hidden flex flex-col justify-center min-h-[220px]">
                    <div className="absolute right-0 bottom-0 opacity-10 translate-x-1/4 translate-y-1/4">
                        <IndianRupee size={240} className="text-primary" />
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 relative z-10">
                        <div>
                            <p className="text-[10px] font-bold uppercase text-text-secondary mb-1 tracking-widest font-mono">Total Budget</p>
                            <p className="text-2xl font-bold text-text">{formatCurrency(budget.limit)}</p>
                            <p className="text-[10px] text-text-secondary font-mono">/ {budget.duration}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase text-text-secondary mb-1 tracking-widest font-mono">Expenses</p>
                            <p className="text-2xl font-bold text-danger">{formatCurrency(totalExpenses)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase text-text-secondary mb-1 tracking-widest font-mono">Remaining</p>
                            <p className="text-2xl font-bold text-primary">{formatCurrency(remaining)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase text-text-secondary mb-1 tracking-widest font-mono">Income</p>
                            <p className="text-2xl font-bold text-success">{formatCurrency(totalIncome)}</p>
                        </div>
                    </div>
                    
                    <div className="mt-8 h-2 w-full bg-surface-hover rounded-full overflow-hidden">
                        <div 
                            className={`h-full transition-all duration-500 ${remaining < 0 ? 'bg-danger' : 'bg-primary'}`}
                            style={{ width: `${Math.min(100, (totalExpenses / (budget.limit || 1)) * 100)}%` }}
                        />
                    </div>
                </div>

                <div className="bg-surface border border-border p-6 rounded-3xl space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-text-secondary flex items-center gap-2 font-mono">
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
                            <label className="text-[10px] font-bold uppercase text-text-secondary ml-1 font-mono">Duration</label>
                            <select 
                                value={durationInput} 
                                onChange={e => setDurationInput(e.target.value)}
                                className="w-full bg-surface-hover border border-border rounded-xl px-4 h-11 text-sm text-text focus:outline-none"
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

            <div className="bg-surface border border-border p-6 rounded-3xl grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
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
                        className={`w-12 px-0 ${transType === 'income' ? 'text-success' : 'text-text-secondary'}`}
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