import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trash2, RefreshCw, Copy, AlertTriangle, Info, AlertCircle, Terminal } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { logger } from '../utils/logger';
import Button from '../components/Button';

interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  context?: any;
  error?: {
    message: string;
    stack?: string;
    name?: string;
  };
}

const DebugLogPage: React.FC = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<'all' | 'error' | 'warn' | 'info'>('all');

  const loadLogs = () => {
    const storedLogs = logger.getLogs();
    setLogs(storedLogs);
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleClearLogs = () => {
    if (confirm('Are you sure you want to clear all logs?')) {
      logger.clearLogs();
      loadLogs();
    }
  };

  const handleCopyLogs = () => {
    const text = JSON.stringify(logs, null, 2);
    navigator.clipboard.writeText(text).then(() => {
      alert('Logs copied to clipboard');
    });
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'error': return <AlertCircle className="text-red-500" size={16} />;
      case 'warn': return <AlertTriangle className="text-yellow-500" size={16} />;
      case 'info': return <Info className="text-blue-500" size={16} />;
      default: return <Terminal className="text-slate-400" size={16} />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'bg-red-500/10 border-red-500/20';
      case 'warn': return 'bg-yellow-500/10 border-yellow-500/20';
      case 'info': return 'bg-blue-500/10 border-blue-500/20';
      default: return 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700';
    }
  };

  const filteredLogs = logs.filter(log => {
    if (filter === 'all') return true;
    return log.level === filter;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 pb-20">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-10">
        <div className="max-w-screen-xl mx-auto px-4 h-16 flex items-center justify-between">
          <button 
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
          >
            <ArrowLeft className="text-slate-600 dark:text-slate-300" size={24} />
          </button>
          <h1 className="text-lg font-semibold text-slate-800 dark:text-white">Debug Logs</h1>
          <div className="w-10" /> {/* Spacer */}
        </div>
        
        {/* Toolbar */}
        <div className="px-4 py-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <div className="flex bg-slate-100 dark:bg-slate-700 rounded-lg p-1 mr-auto">
            {(['all', 'error', 'warn', 'info'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors capitalize ${
                  filter === f 
                    ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          
          <button 
            onClick={loadLogs}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
          >
            <RefreshCw size={20} />
          </button>
          <button 
            onClick={handleCopyLogs}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
          >
            <Copy size={20} />
          </button>
          <button 
            onClick={handleClearLogs}
            className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      {/* Logs List */}
      <div className="max-w-screen-xl mx-auto px-4 py-4 space-y-3">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <Terminal size={48} className="mx-auto mb-4 opacity-50" />
            <p>No logs found</p>
          </div>
        ) : (
          filteredLogs.map((log, index) => (
            <div 
              key={index}
              className={`rounded-lg border p-3 ${getLevelColor(log.level)}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  {getLevelIcon(log.level)}
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                      log.level === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' :
                      log.level === 'warn' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300' :
                      log.level === 'info' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' :
                      'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                    }`}>
                      {log.level}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 break-words font-mono">
                    {log.message}
                  </p>
                  
                  {log.context && Object.keys(log.context).length > 0 && (
                    <details className="mt-2 text-xs">
                      <summary className="cursor-pointer text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 select-none">
                        View Context
                      </summary>
                      <pre className="mt-1 p-2 bg-black/5 dark:bg-black/20 rounded overflow-x-auto whitespace-pre-wrap">
                        {JSON.stringify(log.context, null, 2)}
                      </pre>
                    </details>
                  )}

                  {log.error && (
                    <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-xs overflow-hidden">
                      <p className="font-semibold text-red-700 dark:text-red-300 mb-1">
                        {log.error.name}: {log.error.message}
                      </p>
                      {log.error.stack && (
                        <details>
                          <summary className="cursor-pointer text-red-600/70 hover:text-red-700 dark:text-red-400/70 dark:hover:text-red-300">
                            Stack Trace
                          </summary>
                          <pre className="mt-1 whitespace-pre-wrap font-mono text-[10px] text-red-600 dark:text-red-400">
                            {log.error.stack}
                          </pre>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DebugLogPage;
