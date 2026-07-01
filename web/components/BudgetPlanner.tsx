
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ThemeOption, BudgetShare, Partnership, SharedBudgetInfo, Budget } from '../types';
import * as BudgetService from '../services/budgetService';
import * as PartnerService from '../services/partnerService';
import { useBudget } from '../hooks/useBudget';
import { parseTransactionScreenshot } from '../services/geminiService';
import Button from './Button';
import Input from './Input';
import Select from './Select';
import TransactionList from './TransactionList';
import RecurringBillsManager from './RecurringBillsManager';
import BudgetForecastChart from './BudgetForecastChart';
import BudgetCategoryChart from './BudgetCategoryChart';
import { calculateForecast, formatForecastDate } from '../utils/financialForecasting';
import { Wallet, Plus, Trash2, IndianRupee, Eye, EyeOff, Repeat, ArrowRight, Settings, Share2, User, X, Loader2, UserPlus, Camera, LineChart, PieChart } from 'lucide-react';
import { t } from '../themeText';
import { logger } from '../utils/logger';

interface BudgetPlannerProps {
    currentTheme: ThemeOption;
}

const BudgetPlanner: React.FC<BudgetPlannerProps> = ({ currentTheme }) => {
    // Use the budget hook for state management
    const { budget, updateSettings, addTransaction, addRecurringTransaction, updateTransaction, deleteTransaction, updateRecurring, deleteRecurring } = useBudget();

    const [limitInput, setLimitInput] = useState('');
    const [durationInput, setDurationInput] = useState('Monthly');
    const [transDesc, setTransDesc] = useState('');
    const [transAmount, setTransAmount] = useState('');
    const [transType, setTransType] = useState<'income' | 'expense'>('expense');
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurringFrequency, setRecurringFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
    const [recurringStartDate, setRecurringStartDate] = useState(new Date().toISOString().split('T')[0]);

    // Budget sharing state
    const [budgetShares, setBudgetShares] = useState<BudgetShare[]>([]);
    const [partnerships, setPartnerships] = useState<Partnership[]>([]);
    const [budgetsSharedWithMe, setBudgetsSharedWithMe] = useState<SharedBudgetInfo[]>([]);
    const [expandedPartnerBudget, setExpandedPartnerBudget] = useState<{ ownerId: string; budget: Budget } | null>(null);
    const [isLoadingPartnerBudget, setIsLoadingPartnerBudget] = useState(false);
    const [isLoadingShares, setIsLoadingShares] = useState(true);
    const [selectedPartnerId, setSelectedPartnerId] = useState('');
    const [isSharing, setIsSharing] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [showSavings, setShowSavings] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setLimitInput(budget.limit.toString());
        setDurationInput(budget.duration);
    }, [budget]);

    // Load budget shares and partnerships on mount
    useEffect(() => {
        loadSharingData();
    }, []);

    const loadSharingData = async () => {
        setIsLoadingShares(true);
        const [shares, partners, sharedWithMe] = await Promise.all([
            BudgetService.getBudgetShares(),
            PartnerService.getPartnerships(),
            BudgetService.getBudgetsSharedWithMe()
        ]);
        setBudgetShares(shares);
        // Only show accepted partnerships
        setPartnerships(partners.filter(p => p.status === 'accepted'));
        setBudgetsSharedWithMe(sharedWithMe);
        setIsLoadingShares(false);
    };

    const handleViewPartnerBudget = async (ownerId: string) => {
        // Toggle off if already expanded
        if (expandedPartnerBudget?.ownerId === ownerId) {
            setExpandedPartnerBudget(null);
            return;
        }

        setIsLoadingPartnerBudget(true);
        const partnerBudget = await BudgetService.getSharedBudgetFromPartner(ownerId);
        if (partnerBudget) {
            setExpandedPartnerBudget({ ownerId, budget: partnerBudget });
        }
        setIsLoadingPartnerBudget(false);
    };

    const handleUpdateSettings = async () => {
        const num = parseFloat(limitInput);
        if (!isNaN(num)) {
            await updateSettings({ limit: num, duration: durationInput });
        }
    };

    const handleAddTransaction = async () => {
        const amount = parseFloat(transAmount);
        if (transDesc && !isNaN(amount) && amount > 0) {
            if (isRecurring) {
                await addRecurringTransaction({ 
                    description: transDesc, 
                    amount, 
                    type: transType, 
                    frequency: recurringFrequency,
                    startDate: recurringStartDate
                });

            } else {
                await addTransaction({ description: transDesc, amount, type: transType });
            }
            setTransDesc('');
            setTransAmount('');
            setIsRecurring(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsScanning(true);
        try {
            const transactions = await parseTransactionScreenshot(file);
            
            if (transactions.length === 0) {
                alert('No transactions found in the image. Please try with a clearer screenshot.');
                return;
            }

            for (const tx of transactions) {
                await addTransaction({
                    description: tx.description,
                    amount: tx.amount,
                    type: tx.type
                });
            }

            alert(`Successfully added ${transactions.length} transaction(s) from screenshot!`);
        } catch (error) {
            logger.error('Failed to scan screenshot', error as Error);
            alert('Failed to parse the screenshot. Please try again.');
        } finally {
            setIsScanning(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleShareWithPartner = async () => {
        if (!selectedPartnerId) return;
        setIsSharing(true);
        const success = await BudgetService.shareBudgetWithPartner(selectedPartnerId);
        if (success) {
            await loadSharingData();
            setSelectedPartnerId('');
        }
        setIsSharing(false);
    };

    const handleRemoveShare = async (shareId: string) => {
        const success = await BudgetService.unshareBudgetWithPartner(shareId);
        if (success) {
            setBudgetShares(prev => prev.filter(s => s.id !== shareId));
        }
    };

    // Memoized computed values to avoid recalculation on every render
    const { totalIncome, totalExpenses } = useMemo(() =>
        budget.transactions.reduce((acc, curr) => {
            if (curr.type === 'income') acc.totalIncome += curr.amount;
            else if (curr.type === 'expense') acc.totalExpenses += curr.amount;
            return acc;
        }, { totalIncome: 0, totalExpenses: 0 }),
        [budget.transactions]
    );
    
    const remaining = useMemo(() => budget.limit - totalExpenses, [budget.limit, totalExpenses]);

    const expandedPartnerStats = useMemo(() => {
        if (!expandedPartnerBudget) return { income: 0, expense: 0 };
        return expandedPartnerBudget.budget.transactions.reduce((acc, t) => {
            if (t.type === 'income') acc.income += t.amount;
            else if (t.type === 'expense') acc.expense += t.amount;
            return acc;
        }, { income: 0, expense: 0 });
    }, [expandedPartnerBudget]);

    // Calculate daily safe spend based on remaining budget and days left in period
    const dailySafeSpend = useMemo(() => {
        const now = new Date();
        let daysLeft = 1;
        
        switch (budget.duration) {
            case 'Daily':
                daysLeft = 1;
                break;
            case 'Weekly': {
                const dayOfWeek = now.getDay(); // 0 = Sunday
                daysLeft = 7 - dayOfWeek; // Days until end of week (Saturday)
                break;
            }
            case 'Monthly': {
                const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                daysLeft = lastDay - now.getDate() + 1; // Days left including today
                break;
            }
            case 'Yearly': {
                const endOfYear = new Date(now.getFullYear(), 11, 31);
                const diffTime = endOfYear.getTime() - now.getTime();
                daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                break;
            }
        }
        
        return daysLeft > 0 ? remaining / daysLeft : remaining;
    }, [remaining, budget.duration]);

    // Calculate 30-day forecast based on recurring transactions
    const forecastData = useMemo(() => 
        calculateForecast(remaining, budget.recurring, new Date(), 30),
        [remaining, budget.recurring]
    );

    // Get projected end balance for summary
    const projectedEndBalance = useMemo(() => {
        if (forecastData.length === 0) return remaining;
        return forecastData[forecastData.length - 1].balance;
    }, [forecastData, remaining]);

    // Get projected end date
    const projectedEndDate = useMemo(() => {
        if (forecastData.length === 0) return '';
        return formatForecastDate(forecastData[forecastData.length - 1].date);
    }, [forecastData]);

    const formatCurrency = useCallback((val: number) => {
        return val.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });
    }, []);

    // Get partners not already shared with
    const availablePartners = useMemo(() => 
        partnerships.filter(p => !budgetShares.some(s => s.partnerId === p.partnerId)),
        [partnerships, budgetShares]
    );

    return (
        <div className="space-y-8 animate-fade-in h-full flex flex-col">
            <div className="border-b border-slate-200 dark:border-white/5 pb-6">
                <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2 flex items-center gap-3">
                    <Wallet className="text-brand-500" /> {t(currentTheme, 'budgetPlanner')}
                </h2>
                <p className="text-slate-500 dark:text-slate-400">Track your {t(currentTheme, 'income').toLowerCase()}, expenses, and savings goals.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-20">
                {/* Summary Card */}
                <div className="lg:col-span-2 glass-panel p-8 rounded-3xl relative overflow-hidden flex flex-col justify-center min-h-[220px]">
                    <div className="absolute right-0 bottom-0 opacity-10 translate-x-1/4 translate-y-1/4">
                        <IndianRupee size={240} className="text-brand-500" />
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6 relative z-10">
                        <div>
                            <p className="text-[10px] font-bold uppercase text-slate-400 mb-1 tracking-widest font-mono">{t(currentTheme, 'totalBudget')}</p>
                            <p className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-100">{formatCurrency(budget.limit)}</p>
                            <p className="text-[10px] text-slate-500 font-mono">/ {budget.duration}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase text-slate-400 mb-1 tracking-widest font-mono">Expenses</p>
                            <p className="text-xl sm:text-2xl font-bold text-red-500">{formatCurrency(totalExpenses)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase text-slate-400 mb-1 tracking-widest font-mono">{t(currentTheme, 'remaining')}</p>
                            <p className="text-xl sm:text-2xl font-bold text-brand-500">{formatCurrency(remaining)}</p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase text-slate-400 mb-1 tracking-widest font-mono">{t(currentTheme, 'income')}</p>
                            <p className="text-xl sm:text-2xl font-bold text-emerald-500">{formatCurrency(totalIncome)}</p>
                        </div>
                        <div className="relative group">
                            <p className="text-[10px] font-bold uppercase text-slate-400 mb-1 tracking-widest font-mono flex items-center gap-2">
                                Savings
                                <button onClick={() => setShowSavings(!showSavings)} className="text-slate-400 hover:text-brand-500 transition-colors" aria-label={showSavings ? 'Hide savings' : 'Show savings'}>
                                    {showSavings ? <EyeOff size={12} /> : <Eye size={12} />}
                                </button>
                            </p>
                            <p className={`text-xl sm:text-2xl font-bold ${totalIncome - totalExpenses >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
                                {showSavings ? formatCurrency(totalIncome - totalExpenses) : '••••••'}
                            </p>
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase text-slate-400 mb-1 tracking-widest font-mono">Daily Safe</p>
                            <p className={`text-xl sm:text-2xl font-bold ${dailySafeSpend >= 0 ? 'text-cyan-500' : 'text-red-500'}`}>
                                {formatCurrency(Math.max(0, dailySafeSpend))}
                            </p>
                            <p className="text-[10px] text-slate-500 font-mono">/ day</p>
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
                            <Select
                                value={durationInput}
                                onChange={(value) => setDurationInput(value)}
                                options={[
                                    { value: 'Daily', label: 'Daily' },
                                    { value: 'Weekly', label: 'Weekly' },
                                    { value: 'Monthly', label: 'Monthly' },
                                    { value: 'Yearly', label: 'Yearly' }
                                ]}
                                currentTheme={currentTheme}
                            />
                        </div>
                        <Button variant="primary" className="w-full" onClick={handleUpdateSettings}>Update Budget</Button>
                    </div>
                </div>
            </div>

            {/* 30-Day Cash Flow Projection */}
            <div className="glass-panel p-6 rounded-3xl space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2 font-mono">
                        <LineChart size={14} /> 30-Day Cash Flow Projection
                    </h3>
                    {budget.recurring.length > 0 && (
                        <div className={`text-xs font-medium px-3 py-1 rounded-full ${
                            projectedEndBalance >= 0 
                                ? 'bg-emerald-500/10 text-emerald-500' 
                                : 'bg-red-500/10 text-red-500'
                        }`}>
                            {projectedEndBalance >= 0 ? 'On Track' : 'At Risk'}
                        </div>
                    )}
                </div>
                
                <BudgetForecastChart data={forecastData} formatCurrency={formatCurrency} />
                
                {budget.recurring.length > 0 && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
                        Based on your recurring bills, you are projected to have{' '}
                        <span className={`font-bold ${projectedEndBalance >= 0 ? 'text-brand-500' : 'text-red-500'}`}>
                            {formatCurrency(projectedEndBalance)}
                        </span>{' '}
                        remaining on <span className="font-medium">{projectedEndDate}</span>.
                    </p>
                )}
            </div>

            {/* Spending by Category Chart */}
            <div className="glass-panel p-6 rounded-3xl space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2 font-mono">
                    <PieChart size={14} /> Spending by Category
                </h3>
                <BudgetCategoryChart transactions={budget.transactions} formatCurrency={formatCurrency} />
            </div>

            {/* Quick Transaction */}
            <div className="glass-panel p-6 rounded-3xl space-y-4 relative z-10">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                    {/* Hidden file input */}
                    <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        id="upi-screenshot-input"
                    />
                    
                    {/* Camera Button */}
                    <div className="md:col-span-1">
                        <Button
                            variant="secondary"
                            className="w-full h-11"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isScanning}
                            title="Scan UPI Screenshot"
                            aria-label="Scan transaction screenshot"
                        >
                            {isScanning ? <Loader2 className="animate-spin" size={20} /> : <Camera size={20} />}
                        </Button>
                    </div>

                    {/* Income/Expense Toggle */}
                    <div className="md:col-span-2">
                        <Button
                            variant="secondary"
                            className={`w-full h-11 ${transType === 'income' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}
                            onClick={() => setTransType(prev => prev === 'expense' ? 'income' : 'expense')}
                            title={transType === 'expense' ? 'Switch to Income' : 'Switch to Expense'}
                        >
                            <span className="text-xl font-bold">{transType === 'expense' ? '-' : '+'}</span>
                            <span className="ml-2 text-xs uppercase font-semibold">{transType === 'expense' ? 'Exp' : 'Inc'}</span>
                        </Button>
                    </div>
                    
                    {/* Amount Input */}
                    <div className="md:col-span-2">
                        <Input label="Amount" type="number" value={transAmount} onChange={e => setTransAmount(e.target.value)} placeholder="0.00" />
                    </div>

                    {/* Description Input */}
                    <div className="md:col-span-5">
                        <Input label="Description" value={transDesc} onChange={e => setTransDesc(e.target.value)} placeholder="E.g. Coffee" />
                    </div>

                    {/* Log Button */}
                    <div className="md:col-span-2">
                        <Button variant="primary" className="w-full h-11 font-semibold" onClick={handleAddTransaction}>
                            <Plus size={18} className="mr-1" />
                            Log
                        </Button>
                    </div>
                </div>

                {/* Recurring Transaction Toggle */}
                <div className="flex items-center gap-4 pt-2 border-t border-slate-200 dark:border-white/5">
                    <button
                        onClick={() => setIsRecurring(!isRecurring)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                            isRecurring 
                                ? 'bg-brand-500/10 text-brand-500 border border-brand-500/30' 
                                : 'bg-slate-100 dark:bg-white/5 text-slate-500 border border-transparent hover:bg-slate-200 dark:hover:bg-white/10'
                        }`}
                    >
                        <Repeat size={16} />
                        Recurring
                    </button>
                    
                    {isRecurring && (
                        <Select
                            value={recurringFrequency}
                            onChange={(value) => setRecurringFrequency(value as 'daily' | 'weekly' | 'monthly' | 'yearly')}
                            options={[
                                { value: 'daily', label: 'Daily' },
                                { value: 'weekly', label: 'Weekly' },
                                { value: 'monthly', label: 'Monthly' },
                                { value: 'yearly', label: 'Yearly' }
                            ]}
                            currentTheme={currentTheme}
                            className="min-w-[120px]"
                        />
                    )}

                    {isRecurring && (
                        <div className="flex flex-col">
                           <label className="text-[10px] font-bold uppercase text-slate-400 font-mono mb-1">Start Date</label>
                           <input 
                               type="date"
                               value={recurringStartDate}
                               onChange={(e) => setRecurringStartDate(e.target.value)}
                               className="bg-slate-100 dark:bg-white/5 border border-transparent focus:border-brand-500 rounded-xl px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none transition-all"
                           />
                        </div>
                    )}
                    
                    {isRecurring && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 hidden sm:block">
                            This transaction will repeat {recurringFrequency}
                        </p>
                    )}
                </div>
            </div>

            {/* Share Budget Section */}
            <div className="glass-panel p-6 rounded-3xl space-y-4 relative z-0">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2 font-mono">
                    <Share2 size={14} /> Share Budget
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    Share your budget overview with connected partners so they can view your spending progress.
                </p>

                {isLoadingShares ? (
                    <div className="py-4 flex items-center justify-center text-slate-400">
                        <Loader2 className="animate-spin mr-2" size={18} />
                        Loading...
                    </div>
                ) : (
                    <>
                        {/* Add Partner to Share */}
                        {availablePartners.length > 0 ? (
                            <div className="flex gap-3 items-end">
                                <div className="flex-1">
                                    <label className="text-[10px] font-bold uppercase text-slate-400 ml-1 font-mono">Select Partner</label>
                                    <Select
                                        value={selectedPartnerId}
                                        onChange={(value) => setSelectedPartnerId(value)}
                                        options={[
                                            { value: '', label: 'Choose a partner...' },
                                            ...availablePartners.map(p => ({
                                                value: p.partnerId,
                                                label: p.partnerName || p.partnerEmail
                                            }))
                                        ]}
                                        placeholder="Choose a partner..."
                                        currentTheme={currentTheme}
                                    />
                                </div>
                                <Button
                                    variant="primary"
                                    onClick={handleShareWithPartner}
                                    disabled={!selectedPartnerId || isSharing}
                                    className="h-11"
                                >
                                    {isSharing ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={16} />}
                                    <span className="ml-2">Share</span>
                                </Button>
                            </div>
                        ) : partnerships.length === 0 ? (
                            <div className="py-4 text-center text-slate-400 text-sm bg-slate-50 dark:bg-black/20 rounded-xl">
                                <UserPlus className="mx-auto mb-2 text-slate-300" size={24} />
                                No partners connected yet. Add partners in Settings → Collaboration.
                            </div>
                        ) : (
                            <div className="py-2 text-sm text-slate-500 dark:text-slate-400">
                                Budget shared with all connected partners.
                            </div>
                        )}

                        {/* Shared Partners List */}
                        {budgetShares.length > 0 && (
                            <div className="space-y-2 pt-2">
                                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Currently Shared With</p>
                                {budgetShares.map(share => (
                                    <div 
                                        key={share.id}
                                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-500">
                                                <User size={16} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                                    {share.partnerName || share.partnerEmail}
                                                </p>
                                                {share.partnerName && (
                                                    <p className="text-xs text-slate-500">{share.partnerEmail}</p>
                                                )}
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => handleRemoveShare(share.id)}
                                            className="p-1.5 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                                            title="Remove Share"
                                            aria-label="Remove share"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Budgets Shared With Me */}
            <div className="glass-panel p-6 rounded-3xl space-y-4 relative z-0">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2 font-mono">
                    <User size={14} /> Budgets Shared With Me
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    View budgets that your partners have shared with you.
                </p>

                {isLoadingShares ? (
                    <div className="py-4 flex items-center justify-center text-slate-400">
                        <Loader2 className="animate-spin mr-2" size={18} />
                        Loading...
                    </div>
                ) : budgetsSharedWithMe.length === 0 ? (
                    <div className="py-4 text-center text-slate-400 text-sm bg-slate-50 dark:bg-black/20 rounded-xl">
                        <Share2 className="mx-auto mb-2 text-slate-300" size={24} />
                        No partners have shared their budgets with you yet.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {budgetsSharedWithMe.map(sharedBudget => (
                            <div key={sharedBudget.shareId} className="space-y-2">
                                <div 
                                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 cursor-pointer hover:bg-slate-100 dark:hover:bg-black/30 transition-colors"
                                    onClick={() => handleViewPartnerBudget(sharedBudget.ownerId)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                            <User size={16} />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                                                {sharedBudget.ownerName || sharedBudget.ownerEmail}
                                            </p>
                                            {sharedBudget.ownerName && (
                                                <p className="text-xs text-slate-500">{sharedBudget.ownerEmail}</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-brand-500">
                                        {isLoadingPartnerBudget && expandedPartnerBudget?.ownerId !== sharedBudget.ownerId ? null : (
                                            <>
                                                <span className="text-xs font-medium">
                                                    {expandedPartnerBudget?.ownerId === sharedBudget.ownerId ? 'Hide' : 'View'}
                                                </span>
                                                <ArrowRight size={14} className={`transition-transform ${expandedPartnerBudget?.ownerId === sharedBudget.ownerId ? 'rotate-90' : ''}`} />
                                            </>
                                        )}
                                        {isLoadingPartnerBudget && expandedPartnerBudget?.ownerId !== sharedBudget.ownerId && (
                                            <Loader2 className="animate-spin" size={14} />
                                        )}
                                    </div>
                                </div>

                                {/* Expanded Budget Details */}
                                {expandedPartnerBudget?.ownerId === sharedBudget.ownerId && (
                                    <div className="ml-11 p-4 rounded-xl bg-gradient-to-br from-emerald-500/5 to-brand-500/5 border border-emerald-500/10 space-y-3">
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                            <div>
                                                <p className="text-[10px] font-bold uppercase text-slate-400 font-mono">Budget</p>
                                                <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
                                                    {expandedPartnerBudget.budget.limit.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                                                </p>
                                                <p className="text-[10px] text-slate-500 font-mono">/ {expandedPartnerBudget.budget.duration}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold uppercase text-slate-400 font-mono">Expenses</p>
                                                <p className="text-lg font-bold text-red-500">
                                                    {expandedPartnerStats.expense.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold uppercase text-slate-400 font-mono">Remaining</p>
                                                <p className={`text-lg font-bold ${(expandedPartnerBudget.budget.limit - expandedPartnerStats.expense) >= 0 ? 'text-brand-500' : 'text-red-500'}`}>
                                                    {(expandedPartnerBudget.budget.limit - expandedPartnerStats.expense).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold uppercase text-slate-400 font-mono">Income</p>
                                                <p className="text-lg font-bold text-emerald-500">
                                                    {expandedPartnerStats.income.toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 })}
                                                </p>
                                            </div>
                                        </div>
                                        {/* Progress bar */}
                                        <div className="h-2 w-full bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-500 ${
                                                    (expandedPartnerBudget.budget.limit - expandedPartnerStats.expense) < 0
                                                        ? 'bg-red-500' 
                                                        : 'bg-brand-500'
                                                }`}
                                                style={{ 
                                                    width: `${Math.min(100, (expandedPartnerStats.expense / (expandedPartnerBudget.budget.limit || 1)) * 100)}%`
                                                }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Recurring Bills Manager */}
            <RecurringBillsManager
                recurring={budget.recurring}
                onUpdate={updateRecurring}
                onDelete={deleteRecurring}
            />

            {/* Transaction List */}
            <TransactionList 
                transactions={budget.transactions}
                onEdit={updateTransaction}
                onDelete={deleteTransaction}
            />
        </div>
    );
};

export default React.memo(BudgetPlanner);

