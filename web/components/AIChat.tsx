import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Sparkles, PlusCircle, XCircle, Calendar, Bell, Edit2, Check, Clock, DollarSign, Wallet, TrendingDown, TrendingUp, Pencil, Trash2, RefreshCw, Copy, CheckCheck, ImagePlus, X, Image } from 'lucide-react';
import { chatWithAI, parseTransactionScreenshot } from '../services/geminiService';
import { ChatMessage, Task, TaskPriority, TaskStatus, TaskType, SuggestedPrompt } from '../types';
import * as BudgetService from '../services/budgetService';
import { saveChatHistory, loadChatHistory, clearChatHistory } from '../utils/aiChatStorage';
import Button from './Button';

interface AIChatProps {
  onConfirmTask?: (task: Partial<Task>) => void;
  onEditTask?: (task: Partial<Task>) => void;
  userName: string;
  existingTags: string[];
}

interface AIDraftItem {
    category: 'TASK' | 'EVENT' | 'APPOINTMENT' | 'REMINDER' | 'TRANSACTION' | 'BUDGET_UPDATE';
    data: any;
}

const SUGGESTED_PROMPTS: SuggestedPrompt[] = [
  { label: 'Create a task', prompt: 'Create a task to ', icon: '✓' },
  { label: 'Schedule meeting', prompt: 'Schedule a meeting ', icon: '📅' },
  { label: 'Add transaction', prompt: 'I spent ', icon: '💰' },
  { label: 'Set reminder', prompt: 'Remind me to ', icon: '🔔' },
];

const AIChat: React.FC<AIChatProps> = ({ onConfirmTask, onEditTask, userName, existingTags }) => {
  const WELCOME_MESSAGE: ChatMessage = {
    id: 'welcome',
    role: 'model',
    text: "Hi! I'm ChronoDeX AI. I can create Tasks, Reminders, Events, Appointments, or help manage your Budget. Just tell me what you need.",
    timestamp: Date.now(),
    status: 'sent'
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const loaded = loadChatHistory();
    return loaded && loaded.length > 0 ? loaded : [WELCOME_MESSAGE];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [draftGroups, setDraftGroups] = useState<Record<string, AIDraftItem[]>>({});
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Save conversation to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      saveChatHistory(messages);
    }
  }, [messages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, draftGroups]);

  const getRelativeTime = (timestamp: number): string => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: input,
      timestamp: Date.now(),
      status: 'sending'
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // If there's an attached image, process it for transaction extraction
    if (selectedImage) {
      try {
        const transactions = await parseTransactionScreenshot(selectedImage);
        
        // Update user message status
        setMessages(prev => prev.map(m => m.id === userMsg.id ? { ...m, status: 'sent' as const } : m));
        
        // Create AI response with extracted transactions
        const aiMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'model',
          text: `I found ${transactions.length} transaction(s) in your image. Please review and confirm:`,
          timestamp: Date.now(),
          status: 'sent'
        };
        
        setMessages(prev => [...prev, aiMsg]);
        
        // Create drafts for each transaction
        const drafts: AIDraftItem[] = transactions.map(t => ({
          category: 'TRANSACTION' as const,
          data: {
            description: t.description,
            amount: t.amount,
            type: t.type,
            date: t.date
          }
        }));
        
        if (drafts.length > 0) {
          setDraftGroups(prev => ({ ...prev, [aiMsg.id]: drafts }));
        }
      } catch (error) {
        // Update user message status to error
        setMessages(prev => prev.map(m => m.id === userMsg.id ? { ...m, status: 'error' as const } : m));
        
        const errorMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: 'model',
          text: error instanceof Error ? error.message : 'Failed to process image. Please try again.',
          timestamp: Date.now(),
          status: 'error'
        };
        setMessages(prev => [...prev, errorMsg]);
      } finally {
        setIsLoading(false);
        handleRemoveImage();
      }
      return;
    }

    try {
        const history = messages
          .filter(m => m.status !== 'error') // Exclude error messages from history
          .map(m => ({
            role: m.role,
            parts: [{ text: m.text }] as [{ text: string }]
          }));
        
        const responseText = await chatWithAI(userMsg.text, history, userName, existingTags);
        
        // Update user message status to sent
        setMessages(prev => prev.map(m => m.id === userMsg.id ? { ...m, status: 'sent' as const } : m));
        
        const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
        
        let displayText = responseText;
        let newDrafts: AIDraftItem[] = [];

        if (jsonMatch) {
            try {
                const jsonStr = jsonMatch[1];
                const parsed = JSON.parse(jsonStr);
                const parsedArray = Array.isArray(parsed) ? parsed : [parsed];
                displayText = responseText.replace(jsonMatch[0], '').trim();
                newDrafts = parsedArray.map((p: any) => ({
                    category: p.category || (p.title ? 'TASK' : 'UNKNOWN'),
                    data: p.data || p
                }));
            } catch (e) {
                console.error("Failed to parse AI JSON", e);
            }
        }

        const aiMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'model',
            text: displayText,
            timestamp: Date.now(),
            status: 'sent'
        };
        
        setMessages(prev => [...prev, aiMsg]);
        if (newDrafts.length > 0) {
            setDraftGroups(prev => ({ ...prev, [aiMsg.id]: newDrafts }));
        }
    } catch (error) {
        console.error(error);
        // Mark user message as error
        setMessages(prev => prev.map(m => 
          m.id === userMsg.id 
            ? { ...m, status: 'error' as const, error: 'Failed to send' } 
            : m
        ));
        
        const errorMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'model',
            text: error instanceof Error ? error.message : "Sorry, I encountered a connection error. Please try again.",
            timestamp: Date.now(),
            status: 'error'
        };
        setMessages(prev => [...prev, errorMsg]);
    } finally {
        setIsLoading(false);
    }
  };

  const handleRetry = (msgId: string) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg || msg.role !== 'user') return;
    
    // Remove error message and retry
    setMessages(prev => prev.filter(m => m.id !== msgId && !(m.timestamp > msg.timestamp && m.status === 'error')));
    setInput(msg.text);
    setTimeout(() => handleSend(), 100);
  };

  const handleCopyMessage = async (text: string, msgId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMsgId(msgId);
      setTimeout(() => setCopiedMsgId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleClearChat = useCallback(() => {
    if (confirm('Are you sure you want to clear the chat history? This cannot be undone.')) {
      setMessages([WELCOME_MESSAGE]);
      setDraftGroups({});
      clearChatHistory();
    }
  }, [WELCOME_MESSAGE]);

  const handleSuggestedPrompt = useCallback((prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  }, []);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image must be less than 5MB');
        return;
      }
      setSelectedImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveImage = useCallback(() => {
    setSelectedImage(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [imagePreview]);

  // Helper to ensure AI dates are treated as local time if they lack time component
  const normalizeDraftData = (data: any) => {
    const newData = { ...data };
    
    const fixDate = (dateStr: string) => {
        if (dateStr && typeof dateStr === 'string' && dateStr.length === 10 && !dateStr.includes('T')) {
            return `${dateStr}T09:00:00`;
        }
        return dateStr;
    };

    if (newData.dueDate) newData.dueDate = fixDate(newData.dueDate);
    if (newData.reminderTime) newData.reminderTime = fixDate(newData.reminderTime);
    
    return newData;
  };

  const confirmSingleDraft = (msgId: string, index: number) => {
      const draft = draftGroups[msgId][index];
      if (['TASK', 'EVENT', 'APPOINTMENT', 'REMINDER'].includes(draft.category)) {
          const normalizedData = normalizeDraftData(draft.data);
          onConfirmTask?.({
              ...normalizedData,
              type: draft.category as TaskType,
              status: TaskStatus.TODO,
              subtasks: normalizedData.subtasks || [],
              tags: normalizedData.tags || ['AI-Created'],
          });
      } else if (draft.category === 'TRANSACTION') {
          BudgetService.addTransaction(draft.data.description, Number(draft.data.amount), draft.data.type || 'expense');
      } else if (draft.category === 'BUDGET_UPDATE') {
          BudgetService.updateBudgetSettings(Number(draft.data.limit), draft.data.duration || 'Monthly');
      }
      discardSingleDraft(msgId, index);
  };

  const editSingleDraft = (msgId: string, index: number) => {
    const draft = draftGroups[msgId][index];
    if (['TASK', 'EVENT', 'APPOINTMENT', 'REMINDER'].includes(draft.category)) {
        const normalizedData = normalizeDraftData(draft.data);
        onEditTask?.({
            ...normalizedData,
            type: draft.category as TaskType,
            status: TaskStatus.TODO,
            subtasks: normalizedData.subtasks || [],
            tags: normalizedData.tags || ['AI-Created'],
        });
        discardSingleDraft(msgId, index);
    }
  };

  const discardSingleDraft = (msgId: string, index: number) => {
      setDraftGroups(prev => {
          const group = [...(prev[msgId] || [])];
          group.splice(index, 1);
          if (group.length === 0) {
              const { [msgId]: _, ...rest } = prev;
              return rest;
          }
          return { ...prev, [msgId]: group };
      });
  };

  const renderMessageText = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-bold text-slate-900 dark:text-brand-300">{part.substring(2, part.length - 2)}</strong>;
      }
      return part;
    });
  };

  const renderDraftDetails = (draft: AIDraftItem) => {
    const { data, category } = draft;
    const details: string[] = [];

    if (data.dueDate) details.push(`📅 ${new Date(data.dueDate).toLocaleDateString()}`);
    if (data.priority) details.push(`⚡ ${data.priority}`);
    if (data.location) details.push(`📍 ${data.location}`);
    if (data.duration) details.push(`⏱️ ${data.duration}min`);
    if (data.amount) details.push(`💰 $${data.amount}`);
    if (data.type === 'income') details.push('📈 Income');
    if (data.type === 'expense') details.push('📉 Expense');
    if (data.tags && data.tags.length > 0) details.push(`🏷️ ${data.tags.join(', ')}`);

    return details;
  };

  return (
    <div className="flex flex-col h-full glass rounded-2xl overflow-hidden">
      <div className="p-4 pr-16 border-b border-slate-200 dark:border-white/5 flex items-center justify-between gap-3 bg-white/60 dark:bg-slate-900/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/20 rounded-xl text-purple-500 dark:text-purple-400">
              <Bot size={22} />
          </div>
          <div>
              <h2 className="font-semibold text-slate-800 dark:text-slate-100 leading-tight">AI Assistant</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Smart Scheduling & Budgeting</p>
          </div>
        </div>
        <button
          onClick={handleClearChat}
          className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
          title="Clear chat history"
          aria-label="Clear chat history"
        >
          <Trash2 size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
        {messages.length === 1 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {SUGGESTED_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestedPrompt(prompt.prompt)}
                className="px-3 py-2 text-sm bg-white/80 dark:bg-slate-800/80 border border-brand-500/20 rounded-lg hover:bg-brand-500/10 transition-colors font-medium text-slate-700 dark:text-slate-300"
              >
                {prompt.icon} {prompt.label}
              </button>
            ))}
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id}>
              <div className={`flex gap-4 animate-slide-up ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg ${
                    msg.role === 'user' ? 'bg-gradient-to-br from-brand-500 to-brand-600' : 'bg-gradient-to-br from-purple-500 to-indigo-600'
                }`}>
                    {msg.role === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
                </div>
                <div className="flex-1 max-w-[85%]">
                  <div className={`rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-md whitespace-pre-wrap ${
                      msg.role === 'user' 
                      ? 'bg-white/90 dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-tr-none border border-slate-200 dark:border-white/10' 
                      : 'bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-200 rounded-tl-none'
                  }`}>
                    {renderMessageText(msg.text)}
                    {msg.status === 'error' && (
                      <div className="mt-2 pt-2 border-t border-white/20 dark:border-white/10 flex items-center gap-2">
                        <span className="text-xs opacity-75">Failed to send</span>
                        {msg.role === 'user' && (
                          <button
                            onClick={() => handleRetry(msg.id)}
                            className="text-xs underline hover:opacity-80 flex items-center gap-1"
                            aria-label="Retry sending message"
                          >
                            <RefreshCw size={12} /> Retry
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 px-2">
                    <span className="text-xs text-slate-500 dark:text-slate-400">{getRelativeTime(msg.timestamp)}</span>
                    {msg.status === 'sent' && (
                      <button
                        onClick={() => handleCopyMessage(msg.text, msg.id)}
                        className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1"
                        aria-label="Copy message"
                      >
                        {copiedMsgId === msg.id ? <CheckCheck size={12} /> : <Copy size={12} />}
                        {copiedMsgId === msg.id && <span>Copied!</span>}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {draftGroups[msg.id] && draftGroups[msg.id].length > 0 && (
                  <div className="ml-14 mt-4 max-w-[85%] animate-scale-in space-y-3" role="list" aria-label="Draft items">
                      {draftGroups[msg.id].map((draft, idx) => (
                          <div key={idx} className="bg-white/80 dark:bg-slate-800/80 border border-brand-500/30 rounded-xl p-4 shadow-xl backdrop-blur-md" role="listitem">
                              <div className="flex justify-between items-start mb-2">
                                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-600 dark:text-brand-400">{draft.category}</span>
                                  <div className="flex gap-1" role="group" aria-label="Draft actions">
                                      {['TASK', 'EVENT', 'APPOINTMENT', 'REMINDER'].includes(draft.category) && (
                                        <button 
                                          onClick={() => editSingleDraft(msg.id, idx)} 
                                          className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded transition-colors" 
                                          title="Edit before saving"
                                          aria-label="Edit draft"
                                        >
                                          <Pencil size={16} />
                                        </button>
                                      )}
                                      <button 
                                        onClick={() => confirmSingleDraft(msg.id, idx)} 
                                        className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded transition-colors" 
                                        title="Confirm and Save"
                                        aria-label="Confirm and save draft"
                                      >
                                        <Check size={16} />
                                      </button>
                                      <button 
                                        onClick={() => discardSingleDraft(msg.id, idx)} 
                                        className="p-1.5 text-red-500 hover:bg-red-500/10 rounded transition-colors" 
                                        title="Discard"
                                        aria-label="Discard draft"
                                      >
                                        <XCircle size={16} />
                                      </button>
                                  </div>
                              </div>
                              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">{draft.data.title || draft.data.description}</h4>
                              {draft.data.description && draft.data.title && (
                                <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">{draft.data.description}</p>
                              )}
                              <div className="flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-400">
                                {renderDraftDetails(draft).map((detail, i) => (
                                  <span key={i} className="bg-slate-100 dark:bg-slate-700/50 px-2 py-0.5 rounded">{detail}</span>
                                ))}
                              </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
        ))}
        {isLoading && (
          <div className="flex items-center gap-3 ml-14 animate-slide-up">
            <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
            <span className="text-sm text-slate-500 dark:text-slate-400 animate-pulse">AI is thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-slate-200 dark:border-white/5 bg-white/60 dark:bg-slate-900/80 backdrop-blur-xl">
        <div className="flex gap-3 relative">
            <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                placeholder="Ask me to schedule tasks or budget..."
                className="flex-1 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl px-5 py-3.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-brand-500 transition-all"
                disabled={isLoading}
                aria-label="Chat message input"
                maxLength={500}
            />
            <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                aria-label="Upload image"
            />
            <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="p-3 text-slate-500 hover:text-brand-500 hover:bg-brand-500/10 rounded-xl transition-colors disabled:opacity-50"
                title="Attach image for transaction scanning"
                aria-label="Attach image"
            >
                <ImagePlus size={20} />
            </button>
            <Button 
              onClick={handleSend} 
              disabled={isLoading || (!input.trim() && !selectedImage)} 
              variant="primary" 
              className="rounded-xl w-14 px-0"
              aria-label="Send message"
            >
                <Send size={20} />
            </Button>
        </div>
        
        {/* Image Preview */}
        {imagePreview && (
          <div className="mt-3 relative inline-block">
            <img 
              src={imagePreview} 
              alt="Selected" 
              className="max-h-32 rounded-lg border border-slate-200 dark:border-white/10"
            />
            <button
              onClick={handleRemoveImage}
              className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
              aria-label="Remove image"
            >
              <X size={14} />
            </button>
            <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-black/60 rounded text-xs text-white flex items-center gap-1">
              <Image size={12} />
              <span>Transaction Image</span>
            </div>
          </div>
        )}
        {input.length > 400 && (
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-right">
            {500 - input.length} characters remaining
          </p>
        )}
      </div>
    </div>
  );
};

export default React.memo(AIChat);