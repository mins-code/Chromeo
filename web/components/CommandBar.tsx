import React, { useState, useEffect, useRef } from 'react';
import { Command, Loader2, Sparkles, X } from 'lucide-react';
import { parseNaturalLanguageTask, ParsedTaskData } from '../services/geminiService';

interface CommandBarProps {
    isOpen: boolean;
    onClose: () => void;
    onTaskParsed: (data: ParsedTaskData) => void;
}

const CommandBar: React.FC<CommandBarProps> = ({ isOpen, onClose, onTaskParsed }) => {
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
        if (!isOpen) {
            setInput('');
            setIsLoading(false);
        }
    }, [isOpen]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        setIsLoading(true);
        try {
            const parsed = await parseNaturalLanguageTask(input.trim());
            if (parsed) {
                onTaskParsed(parsed);
                onClose();
            }
        } catch (error) {
            console.error('Failed to parse task:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
                onClick={onClose}
            />

            {/* Command Bar Modal */}
            <div className="relative w-full max-w-2xl animate-scale-in">
                <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-200 dark:border-white/5">
                        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-500/10">
                            <Sparkles size={18} className="text-brand-500" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Quick Add</h3>
                            <p className="text-xs text-slate-500">Describe a task in natural language</p>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Input Form */}
                    <form onSubmit={handleSubmit}>
                        <div className="relative">
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="e.g., Meeting with Sam tomorrow at 2pm at the coffee shop"
                                disabled={isLoading}
                                className="w-full px-5 py-4 text-lg bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none disabled:opacity-50"
                            />
                            {isLoading && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <Loader2 size={20} className="animate-spin text-brand-500" />
                                </div>
                            )}
                        </div>
                    </form>

                    {/* Footer Tips */}
                    <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-white/5">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                            <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1.5">
                                    <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[10px]">Enter</kbd>
                                    to create
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[10px]">Esc</kbd>
                                    to close
                                </span>
                            </div>
                            <div className="flex items-center gap-1 text-brand-500">
                                <Sparkles size={12} />
                                <span>AI-powered parsing</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Example hints */}
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {[
                        'Doctor appointment Friday at 3pm',
                        'Remind me to call Mom at 5pm',
                        'Team standup meeting tomorrow 9am',
                        'Buy groceries this weekend'
                    ].map((example) => (
                        <button
                            key={example}
                            onClick={() => setInput(example)}
                            className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 text-white/70 hover:text-white rounded-full backdrop-blur-sm transition-colors border border-white/10"
                        >
                            {example}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CommandBar;
