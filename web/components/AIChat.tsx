import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, PlusCircle, XCircle, Calendar, Bell, Edit2, Check, Clock, DollarSign, Wallet, TrendingDown, TrendingUp, Pencil } from 'lucide-react';
import { chatWithAI } from '../services/geminiService';
import { ChatMessage, Task, TaskPriority, TaskStatus, TaskType } from '../types';
import * as BudgetService from '../services/budgetService';
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

const AIChat: React.FC<AIChatProps> = ({ onConfirmTask, onEditTask, userName, existingTags }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: "Hi! I'm ChronoDeX AI. I can create Tasks, Reminders, Events, Appointments, or help manage your Budget. Just tell me what you need.",
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [draftGroups, setDraftGroups] = useState<Record<string, AIDraftItem[]>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, draftGroups]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
        const history = messages.map(m => ({
            role: m.role,
            parts: [{ text: m.text }] as [{ text: string }]
        }));
        
        const responseText = await chatWithAI(userMsg.text, history, userName, existingTags);
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
            timestamp: Date.now()
        };
        
        setMessages(prev => [...prev, aiMsg]);
        if (newDrafts.length > 0) {
            setDraftGroups(prev => ({ ...prev, [aiMsg.id]: newDrafts }));
        }
    } catch (error) {
        console.error(error);
        const errorMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'model',
            text: "Sorry, I encountered a connection error. Please try again.",
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, errorMsg]);
    } finally {
        setIsLoading(false);
    }
  };

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

  return (
    <div className="flex flex-col h-full glass rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-white/5 flex items-center gap-3 bg-white/60 dark:bg-slate-900/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="p-2.5 bg-gradient-to-br from-purple-500/20 to-indigo-500/20 border border-purple-500/20 rounded-xl text-purple-500 dark:text-purple-400">
            <Bot size={22} />
        </div>
        <div>
            <h2 className="font-semibold text-slate-800 dark:text-slate-100 leading-tight">AI Assistant</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Smart Scheduling & Budgeting</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id}>
              <div className={`flex gap-4 animate-slide-up ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg ${
                    msg.role === 'user' ? 'bg-gradient-to-br from-brand-500 to-brand-600' : 'bg-gradient-to-br from-purple-500 to-indigo-600'
                }`}>
                    {msg.role === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
                </div>
                <div className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-md whitespace-pre-wrap ${
                    msg.role === 'user' 
                    ? 'bg-brand-500 text-white rounded-tr-none' 
                    : 'bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-white/5 text-slate-700 dark:text-slate-200 rounded-tl-none'
                }`}>
                  {renderMessageText(msg.text)}
                </div>
              </div>

              {draftGroups[msg.id] && draftGroups[msg.id].length > 0 && (
                  <div className="ml-14 mt-4 max-w-[85%] animate-scale-in space-y-3">
                      {draftGroups[msg.id].map((draft, idx) => (
                          <div key={idx} className="bg-white/80 dark:bg-slate-800/80 border border-brand-500/30 rounded-xl p-4 shadow-xl backdrop-blur-md">
                              <div className="flex justify-between items-start mb-2">
                                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-brand-500/10 text-brand-600 dark:text-brand-400">{draft.category}</span>
                                  <div className="flex gap-1">
                                      {['TASK', 'EVENT', 'APPOINTMENT', 'REMINDER'].includes(draft.category) && (
                                        <button onClick={() => editSingleDraft(msg.id, idx)} className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded transition-colors" title="Edit before saving">
                                          <Pencil size={16} />
                                        </button>
                                      )}
                                      <button onClick={() => confirmSingleDraft(msg.id, idx)} className="p-1.5 text-emerald-500 hover:bg-emerald-500/10 rounded transition-colors" title="Confirm and Save">
                                        <Check size={16} />
                                      </button>
                                      <button onClick={() => discardSingleDraft(msg.id, idx)} className="p-1.5 text-red-500 hover:bg-red-500/10 rounded transition-colors" title="Discard">
                                        <XCircle size={16} />
                                      </button>
                                  </div>
                              </div>
                              <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{draft.data.title || draft.data.description}</h4>
                          </div>
                      ))}
                  </div>
              )}
          </div>
        ))}
        {isLoading && <div className="ml-14 w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-slate-200 dark:border-white/5 bg-white/60 dark:bg-slate-900/80 backdrop-blur-xl">
        <div className="flex gap-3 relative">
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask me to schedule tasks or budget..."
                className="flex-1 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/10 rounded-xl px-5 py-3.5 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-brand-500 transition-all"
            />
            <Button onClick={handleSend} disabled={isLoading || !input.trim()} variant="primary" className="rounded-xl w-14 px-0">
                <Send size={20} />
            </Button>
        </div>
      </div>
    </div>
  );
};

export default AIChat;