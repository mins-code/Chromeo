
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ThemeOption, BudgetShare, Partnership } from '../types';
import * as BudgetService from '../services/budgetService';
import * as PartnerService from '../services/partnerService';
import { useBudget } from '../hooks/useBudget';
import { parseTransactionScreenshot } from '../services/geminiService';
import Button from './Button';
import Input from './Input';
import TransactionList from './TransactionList';
import { Wallet, TrendingUp, TrendingDown, Plus, Trash2, IndianRupee, Eye, EyeOff, Repeat, ArrowRight, Settings, Share2, User, X, Loader2, UserPlus, Camera } from 'lucide-react';
import { t } from '../themeText';

interface BudgetPlannerProps {
    currentTheme: ThemeOption;
}

const BudgetPlanner: React.FC<BudgetPlannerProps> = ({ currentTheme }) => {
    // Use the budget hook for state management
    const { budget, updateSettings, addTransaction } = useBudget();

    const [limitInput, setLimitInput] = useState('');
    const [durationInput, setDurationInput] = useState('Monthly');
    const [transDesc, setTransDesc] = useState('');
    const [transAmount, setTransAmount] = useState('');
    const [transType, setTransType] = useState<'income' | 'expense'>('expense');

    // Budget sharing state
    const [budgetShares, setBudgetShares] = useState<BudgetShare[]>([]);
    const [partnerships, setPartnerships] = useState<Partnership[]>([]);
    const [isLoadingShares, setIsLoadingShares] = useState(true);
    const [selectedPartnerId, setSelectedPartnerId] = useState('');
    const [isSharing, setIsSharing] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
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
        const [shares, partners] = await Promise.all([
            BudgetService.getBudgetShares(),
            PartnerService.getPartnerships()
        ]);
        setBudgetShares(shares);
        // Only show accepted partnerships
        setPartnerships(partners.filter(p => p.status === 'accepted'));
        setIsLoadingShares(false);
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
            await addTransaction({ description: transDesc, amount, type: transType });
            setTransDesc('');
            setTransAmount('');
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
            console.error('Failed to scan screenshot:', error);
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
    const totalIncome = useMemo(() => 
        budget.transactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0),
        [budget.transactions]
    );
    
    const totalExpenses = useMemo(() => 
        budget.transactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0),
        [budget.transactions]
    );
    
    const remaining = useMemo(() => budget.limit - totalExpenses, [budget.limit, totalExpenses]);

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
                {/* Action Buttons - Now First */}
                <div className="flex gap-2 md:col-span-1">
                    <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        id="upi-screenshot-input"
                    />
                    <Button
                        variant="secondary"
                        className={`flex-1 h-11 ${transType === 'income' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}
                        onClick={() => setTransType(prev => prev === 'expense' ? 'income' : 'expense')}
                        title={transType === 'expense' ? 'Switch to Income' : 'Switch to Expense'}
                    >
                        <span className="text-xl font-bold">{transType === 'expense' ? '-' : '+'}</span>
                        <span className="ml-2 text-xs uppercase font-semibold">{transType === 'expense' ? 'Exp' : 'Inc'}</span>
                    </Button>
                    <Button
                        variant="secondary"
                        className="flex-1 h-11"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isScanning}
                        title="Scan UPI Screenshot"
                    >
                        {isScanning ? <Loader2 className="animate-spin" size={20} /> : <Camera size={20} />}
                    </Button>
                    <Button variant="primary" className="flex-1 h-11 font-semibold" onClick={handleAddTransaction}>
                        <Plus size={18} className="mr-1" />
                        Log
                    </Button>
                </div>
                
                {/* Input Fields */}
                <div className="md:col-span-2">
                    <Input label="Description" value={transDesc} onChange={e => setTransDesc(e.target.value)} placeholder="E.g. Coffee" />
                </div>
                <div>
                    <Input label="Amount" type="number" value={transAmount} onChange={e => setTransAmount(e.target.value)} placeholder="0.00" />
                </div>
            </div>

            {/* Share Budget Section */}
            <div className="glass-panel p-6 rounded-3xl space-y-4">
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
                                    <select
                                        value={selectedPartnerId}
                                        onChange={e => setSelectedPartnerId(e.target.value)}
                                        className="w-full bg-white dark:bg-black/30 border border-slate-300 dark:border-white/10 rounded-xl px-4 h-11 text-sm text-slate-800 dark:text-slate-100 focus:outline-none"
                                    >
                                        <option value="">Choose a partner...</option>
                                        {availablePartners.map(p => (
                                            <option key={p.partnerId} value={p.partnerId}>
                                                {p.partnerName || p.partnerEmail}
                                            </option>
                                        ))}
                                    </select>
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

            {/* Transaction List */}
            <TransactionList transactions={budget.transactions} />
        </div>
    );
};

export default React.memo(BudgetPlanner);

