
import React from 'react';
import { Transaction } from '../types';
import { ArrowUpRight, ArrowDownLeft, Calendar, Search } from 'lucide-react';

interface TransactionListProps {
    transactions: Transaction[];
    className?: string;
}

const TransactionList: React.FC<TransactionListProps> = ({ transactions, className = '' }) => {
    const [searchTerm, setSearchTerm] = React.useState('');

    const filteredTransactions = transactions.filter(t => 
        t.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!transactions.length) {
        return null;
    }

    return (
        <div className={`glass-panel p-6 rounded-3xl space-y-4 ${className}`}>
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 font-mono">
                    Recent Transactions
                </h3>
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-slate-100 dark:bg-black/30 border border-slate-200 dark:border-white/10 rounded-full pl-9 pr-4 py-1.5 text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500/50 w-48"
                    />
                </div>
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {filteredTransactions.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-sm">
                        No transactions found
                    </div>
                ) : (
                    filteredTransactions.map((t) => (
                        <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50/50 dark:bg-white/5 border border-slate-100 dark:border-white/5 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors group">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                    t.type === 'income' 
                                        ? 'bg-emerald-500/10 text-emerald-500' 
                                        : 'bg-red-500/10 text-red-500'
                                }`}>
                                    {t.type === 'income' ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{t.description}</p>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <Calendar size={12} />
                                        <span>{new Date(t.date).toLocaleDateString()}</span>
                                        <span>•</span>
                                        <span>{new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                </div>
                            </div>
                            <span className={`font-bold font-mono ${
                                t.type === 'income' ? 'text-emerald-500' : 'text-slate-700 dark:text-slate-300'
                            }`}>
                                {t.type === 'income' ? '+' : '-'}{t.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                            </span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default TransactionList;
