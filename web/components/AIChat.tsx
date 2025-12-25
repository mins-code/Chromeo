import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Check, XCircle, Pencil } from 'lucide-react';
import { chatWithAI } from '../services/geminiService';
import { ChatMessage, Task, TaskStatus, TaskType, ThemeOption } from '../types';
import * as BudgetService from '../services/budgetService';
import Button from './Button';

interface AIChatProps {
  onConfirmTask?: (task: Partial<Task>) => void;
  onEditTask?: (task: Partial<Task>) => void;
  userName: string;
  existingTags: string[];
  theme: ThemeOption;
}

interface AIDraftItem {
    category: 'TASK' | 'EVENT' | 'APPOINTMENT' | 'REMINDER' | 'TRANSACTION' | 'BUDGET_UPDATE';
    data: any;
}

const AIChat: React.FC<AIChatProps> = ({ onConfirmTask, onEditTask, userName, existingTags, theme }) => {
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, draftGroups]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: ChatMessage = { id: crypto.randomUUID(), role: 'user', text: input, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
        const history = messages.map(m => ({ role: m.role, parts: [{ text: m.text }] as [{ text: string }] }));
        const responseText = await chatWithAI(userMsg.text, history, userName, existingTags);
        const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
        
        let displayText = responseText;
        let newDrafts: AIDraftItem[] = [];

        if (jsonMatch) {
            try {
                const parsed = JSON.parse(jsonMatch[1]);
                const parsedArray = Array.isArray(parsed) ? parsed : [parsed];
                displayText = responseText.replace(jsonMatch[0], '').trim();
                newDrafts = parsedArray.map((p: any) => ({ category: p.category || 'TASK', data: p.data || p }));
            } catch (e) { console.error("Failed to parse AI JSON", e); }
        }

        const aiMsg: ChatMessage = { id: crypto.randomUUID(), role: 'model', text: displayText, timestamp: Date.now() };
        setMessages(prev => [...prev, aiMsg]);
        if (newDrafts.length > 0) setDraftGroups(prev => ({ ...prev, [aiMsg.id]: newDrafts }));
    } catch (error) {
        setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'model', text: "Connection error.", timestamp: Date.now() }]);
    } finally {
        setIsLoading(false);
    }
  };

  const normalizeDraftData = (data: any) => {
    const newData = { ...data };
    const fixDate = (dateStr: string) => (dateStr && dateStr.length === 10 && !dateStr.includes('T')) ? `${dateStr}T09:00:00` : dateStr;
    if (newData.dueDate) newData.dueDate = fixDate(newData.dueDate);
    if (newData.reminderTime) newData.reminderTime = fixDate(newData.reminderTime);
    return newData;
  };

  const confirmSingleDraft = (msgId: string, index: number) => {
      const draft = draftGroups[msgId][index];
      if (['TASK', 'EVENT', 'APPOINTMENT', 'REMINDER'].includes(draft.category)) {
          onConfirmTask?.({
              ...normalizeDraftData(draft.data),
              type: draft.category as TaskType,
              status: TaskStatus.TODO,
              subtasks: draft.data.subtasks || [],
              tags: draft.data.tags || ['AI-Created'],
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
        onEditTask?.({
            ...normalizeDraftData(draft.data),
            type: draft.category as TaskType,
            status: TaskStatus.TODO,
            subtasks: draft.data.subtasks || [],
            tags: draft.data.tags || ['AI-Created'],
        });
        discardSingleDraft(msgId, index);
    }
  };

  const discardSingleDraft = (msgId: string, index: number) => {
      setDraftGroups(prev => {
          const group = [...(prev[msgId] || [])];
          group.splice(index, 1);
          return group.length === 0 ? (({ [msgId]: _, ...rest }) => rest)(prev) : { ...prev, [msgId]: group };
      });
  };

  return (
    <div className={`flex flex-col h-full bg-surface border border-border rounded-2xl overflow-hidden theme-${theme}`}>
      <div className="p-4 border-b border-border flex items-center gap-3 bg-surface-hover backdrop-blur-xl sticky top-0 z-10">
        <div className="p-2.5 bg-accent/10 border border-accent/20 rounded-xl text-accent">
            <Bot size={22} />
        </div>
        <div>
            <h2 className="font-semibold text-text leading-tight">AI Assistant</h2>
            <p className="text-xs text-text-secondary font-medium">Smart Scheduling & Budgeting</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar bg-surface">
        {messages.map((msg) => (
          <div key={msg.id}>
              <div className={`flex gap-4 animate-slide-up ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg ${
                    msg.role === 'user' ? 'bg-primary text-white' : 'bg-accent text-white'
                }`}>
                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={`max-w-[85%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-md whitespace-pre-wrap ${
                    msg.role === 'user' 
                    ? 'bg-primary text-white rounded-tr-none' 
                    : 'bg-surface-hover border border-border text-text rounded-tl-none'
                }`}>
                  {msg.text}
                </div>
              </div>

              {draftGroups[msg.id] && draftGroups[msg.id].length > 0 && (
                  <div className="ml-14 mt-4 max-w-[85%] animate-scale-in space-y-3">
                      {draftGroups[msg.id].map((draft, idx) => (
                          <div key={idx} className="bg-surface-hover border border-primary/30 rounded-xl p-4 shadow-xl backdrop-blur-md">
                              <div className="flex justify-between items-start mb-2">
                                  <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-primary/10 text-primary">{draft.category}</span>
                                  <div className="flex gap-1">
                                      {['TASK', 'EVENT', 'APPOINTMENT', 'REMINDER'].includes(draft.category) && (
                                        <button onClick={() => editSingleDraft(msg.id, idx)} className="p-1.5 text-info hover:bg-info/10 rounded transition-colors">
                                          <Pencil size={16} />
                                        </button>
                                      )}
                                      <button onClick={() => confirmSingleDraft(msg.id, idx)} className="p-1.5 text-success hover:bg-success/10 rounded transition-colors">
                                        <Check size={16} />
                                      </button>
                                      <button onClick={() => discardSingleDraft(msg.id, idx)} className="p-1.5 text-danger hover:bg-danger/10 rounded transition-colors">
                                        <XCircle size={16} />
                                      </button>
                                  </div>
                              </div>
                              <h4 className="text-sm font-bold text-text">{draft.data.title || draft.data.description}</h4>
                          </div>
                      ))}
                  </div>
              )}
          </div>
        ))}
        {isLoading && <div className="ml-14 w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-border bg-surface-hover backdrop-blur-xl">
        <div className="flex gap-3 relative">
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask me to schedule tasks or budget..."
                className="flex-1 bg-surface border border-border rounded-xl px-5 py-3.5 text-text focus:outline-none focus:border-primary transition-all"
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