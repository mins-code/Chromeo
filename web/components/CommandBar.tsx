import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Loader2, 
  Sparkles, 
  X, 
  Mic, 
  MicOff,
  CheckSquare,
  FileText,
  CreditCard,
  Layout,
  Search,
  ArrowRight
} from 'lucide-react';
import { parseNaturalLanguageTask, ParsedTaskData } from '../services/geminiService';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useTasks } from '../hooks/useTasks';
import { useNotes } from '../hooks/useNotes';
import { useBudget } from '../hooks/useBudget';
import { useUniversalSearch, SearchResult } from '../hooks/useUniversalSearch';

interface CommandBarProps {
    isOpen: boolean;
    onClose: () => void;
    onTaskParsed: (data: ParsedTaskData) => void;
    onOpenTask?: (taskId: string) => void;
}

// Icon mapping for search result types
const ResultIcon: React.FC<{ type: SearchResult['type']; className?: string }> = ({ type, className }) => {
  switch (type) {
    case 'TASK':
      return <CheckSquare className={className} size={16} />;
    case 'NOTE':
      return <FileText className={className} size={16} />;
    case 'TRANSACTION':
      return <CreditCard className={className} size={16} />;
    case 'PAGE':
      return <Layout className={className} size={16} />;
    default:
      return <Search className={className} size={16} />;
  }
};

const CommandBar: React.FC<CommandBarProps> = ({ isOpen, onClose, onTaskParsed, onOpenTask }) => {
    const navigate = useNavigate();
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const inputRef = useRef<HTMLInputElement>(null);
    const resultsRef = useRef<HTMLDivElement>(null);

    // Hooks for data
    const { tasks } = useTasks();
    const { notes } = useNotes();
    const { budget } = useBudget();

    // Universal search
    const { results } = useUniversalSearch({
        query: input,
        tasks,
        notes,
        transactions: budget.transactions,
    });

    const {
        isListening,
        transcript,
        error: speechError,
        isSupported: isSpeechSupported,
        startListening,
        stopListening,
        resetTranscript,
    } = useSpeechRecognition();

    // Reset selection when query changes
    useEffect(() => {
        setSelectedIndex(-1);
    }, [input]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
        if (!isOpen) {
            setInput('');
            setIsLoading(false);
            setSelectedIndex(-1);
            resetTranscript();
            if (isListening) {
                stopListening();
            }
        }
    }, [isOpen, resetTranscript, isListening, stopListening]);

    // Update input when transcript changes
    useEffect(() => {
        if (transcript) {
            setInput(transcript);
        }
    }, [transcript]);

    // Handle navigation to a search result
    const handleResultSelect = useCallback((result: SearchResult) => {
        if (isListening) {
            stopListening();
        }
        
        // Handle task navigation - open the task editor if handler is provided
        if (result.type === 'TASK' && onOpenTask) {
            onOpenTask(result.id);
            onClose();
            return;
        }

        // Navigate to the URL
        if (result.url) {
            navigate(result.url);
            onClose();
        }
    }, [navigate, onClose, isListening, stopListening, onOpenTask]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            if (e.key === 'Escape') {
                if (isListening) {
                    stopListening();
                }
                onClose();
                return;
            }

            // Handle arrow navigation when we have results
            if (results.length > 0) {
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedIndex((prev) => 
                        prev < results.length - 1 ? prev + 1 : prev
                    );
                    return;
                }
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
                    return;
                }
            }

            // Handle Enter key
            if (e.key === 'Enter' && !e.isComposing) {
                // If a result is selected, navigate to it
                if (selectedIndex >= 0 && selectedIndex < results.length) {
                    e.preventDefault();
                    handleResultSelect(results[selectedIndex]);
                }
                // Otherwise, form submission will handle creating a task
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose, isListening, stopListening, results, selectedIndex, handleResultSelect]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        // If a result is selected, navigate to it instead
        if (selectedIndex >= 0 && selectedIndex < results.length) {
            handleResultSelect(results[selectedIndex]);
            return;
        }

        // Stop listening if active
        if (isListening) {
            stopListening();
        }

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

    const handleMicClick = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
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
                            <h3 className="font-semibold text-slate-800 dark:text-slate-100">Quick Add / Search</h3>
                            <p className="text-xs text-slate-500">
                                {isListening ? 'Listening... Speak your task' : 'Search or describe a task in natural language'}
                            </p>
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                            aria-label="Close command bar"
                        >
                            <X size={18} />
                        </button>
                    </div>

                    {/* Input Form */}
                    <form onSubmit={handleSubmit}>
                        <div className="relative flex items-center">
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder={isListening ? "Listening..." : "Search tasks, notes, pages... or create new task"}
                                disabled={isLoading}
                                className="w-full px-5 py-4 pr-20 text-lg bg-transparent text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none disabled:opacity-50"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                {/* Speech Error Indicator */}
                                {speechError && (
                                    <span className="text-xs text-red-500 max-w-[120px] truncate" title={speechError}>
                                        {speechError}
                                    </span>
                                )}
                                
                                {/* Microphone Button */}
                                {isSpeechSupported && (
                                    <button
                                        type="button"
                                        onClick={handleMicClick}
                                        disabled={isLoading}
                                        className={`p-2 rounded-lg transition-all ${
                                            isListening
                                                ? 'bg-red-500/10 text-red-500 animate-pulse'
                                                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                                        } disabled:opacity-50`}
                                        title={isListening ? 'Stop listening' : 'Start voice input'}
                                        aria-label={isListening ? 'Stop voice input' : 'Start voice input'}
                                    >
                                        {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                                    </button>
                                )}
                                
                                {/* Loading Indicator */}
                                {isLoading && (
                                    <Loader2 size={20} className="animate-spin text-brand-500" />
                                )}
                            </div>
                        </div>
                    </form>

                    {/* Search Results */}
                    {results.length > 0 && (
                        <div 
                            ref={resultsRef}
                            className="border-t border-slate-200 dark:border-white/5"
                        >
                            <div className="px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <Search size={12} />
                                Jump To
                            </div>
                            <div className="pb-2">
                                {results.map((result, index) => (
                                    <button
                                        key={`${result.type}-${result.id}`}
                                        onClick={() => handleResultSelect(result)}
                                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                                            index === selectedIndex
                                                ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400'
                                                : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                        }`}
                                    >
                                        <div className={`flex-shrink-0 p-1.5 rounded-md ${
                                            result.type === 'TASK' ? 'bg-blue-500/10 text-blue-500' :
                                            result.type === 'NOTE' ? 'bg-amber-500/10 text-amber-500' :
                                            result.type === 'TRANSACTION' ? 'bg-green-500/10 text-green-500' :
                                            'bg-purple-500/10 text-purple-500'
                                        }`}>
                                            <ResultIcon type={result.type} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium truncate">{result.title}</div>
                                            {result.subtitle && (
                                                <div className="text-xs text-slate-500 truncate">{result.subtitle}</div>
                                            )}
                                        </div>
                                        <div className="flex-shrink-0 text-slate-400">
                                            <ArrowRight size={14} />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Create Task Option (when there's input but maybe no exact matches) */}
                    {input.trim() && (
                        <div className="border-t border-slate-200 dark:border-white/5">
                            <div className="px-4 py-2 text-xs font-medium text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <Sparkles size={12} />
                                Actions
                            </div>
                            <button
                                type="submit"
                                onClick={handleSubmit}
                                disabled={isLoading}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                                    selectedIndex === -1 && results.length === 0
                                        ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400'
                                        : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                } disabled:opacity-50`}
                            >
                                <div className="flex-shrink-0 p-1.5 rounded-md bg-brand-500/10 text-brand-500">
                                    <Sparkles size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium">Create "{input.trim()}"</div>
                                    <div className="text-xs text-slate-500">AI will parse this as a task</div>
                                </div>
                                {isLoading ? (
                                    <Loader2 size={14} className="animate-spin text-brand-500" />
                                ) : (
                                    <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[10px] text-slate-500">Enter</kbd>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Footer Tips */}
                    <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-white/5">
                        <div className="flex items-center justify-between text-xs text-slate-500">
                            <div className="flex items-center gap-4">
                                <span className="flex items-center gap-1.5">
                                    <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[10px]">↑↓</kbd>
                                    navigate
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[10px]">Enter</kbd>
                                    select
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <kbd className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono text-[10px]">Esc</kbd>
                                    close
                                </span>
                                {isSpeechSupported && (
                                    <span className="flex items-center gap-1.5">
                                        <Mic size={12} />
                                        voice
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1 text-brand-500">
                                <Sparkles size={12} />
                                <span>AI-powered</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Example hints (only when empty) */}
                {!input.trim() && (
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                        {[
                            'Doctor appointment Friday at 3pm',
                            'Go to Calendar',
                            'Team standup meeting tomorrow 9am',
                            'Open Budget'
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
                )}
            </div>
        </div>
    );
};

export default CommandBar;
