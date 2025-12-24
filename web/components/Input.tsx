
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 ml-1 font-mono">{label}</label>}
      <div className="relative">
        <input
          className={`w-full bg-white dark:bg-black/30 border border-slate-300 dark:border-white/10 rounded-xl px-4 py-2.5 h-11 text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500/50 focus:border-brand-500 transition-all shadow-sm flex items-center ${error ? 'border-red-500/50 focus:ring-red-500' : 'hover:border-slate-400 dark:hover:border-slate-500'} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-500 dark:text-red-400 ml-1 animate-slide-up font-mono">{error}</p>}
    </div>
  );
};

export default Input;
