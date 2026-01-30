import React, { useState, useEffect, useCallback } from 'react';
import { Task } from '../types';
import { X, Play, Pause, Plus, CheckCircle2, Target } from 'lucide-react';
import Button from './Button';

interface FocusSessionProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (task: Task) => void;
}

const DEFAULT_FOCUS_TIME = 25 * 60; // 25 minutes in seconds

const FocusSession: React.FC<FocusSessionProps> = ({ task, isOpen, onClose, onComplete }) => {
  const [timeRemaining, setTimeRemaining] = useState(DEFAULT_FOCUS_TIME);
  const [isRunning, setIsRunning] = useState(true);
  const [isTimerComplete, setIsTimerComplete] = useState(false);
  const [a11yStatus, setA11yStatus] = useState('');

  // Reset timer when opening with a new task
  useEffect(() => {
    if (isOpen) {
      setTimeRemaining(DEFAULT_FOCUS_TIME);
      setIsRunning(true);
      setIsTimerComplete(false);
      setA11yStatus(`Focus session started for ${task.title}`);
    }
  }, [isOpen, task?.id, task.title]);

  // Handle Escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Countdown logic
  useEffect(() => {
    if (!isOpen || !isRunning || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setIsRunning(false);
          setIsTimerComplete(true);
          setA11yStatus("Time's up! Great job.");
          // Play notification sound (using Web Audio API for a simple beep)
          try {
            const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
          } catch (e) {
            // Audio not supported, silently fail
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, isRunning, timeRemaining]);

  const togglePause = useCallback(() => {
    if (isTimerComplete) {
      // Restart timer if complete
      setTimeRemaining(DEFAULT_FOCUS_TIME);
      setIsTimerComplete(false);
      setIsRunning(true);
      setA11yStatus("Timer restarted");
    } else {
      setIsRunning(prev => {
        const nextState = !prev;
        setA11yStatus(nextState ? "Timer resumed" : "Timer paused");
        return nextState;
      });
    }
  }, [isTimerComplete]);

  const addFiveMinutes = useCallback(() => {
    setTimeRemaining(prev => {
      const next = prev + 5 * 60;
      const mins = Math.floor(next / 60);
      setA11yStatus(`Added 5 minutes. ${mins} minutes remaining.`);
      return next;
    });
    if (isTimerComplete) {
      setIsTimerComplete(false);
      setIsRunning(true);
    }
  }, [isTimerComplete]);

  const handleComplete = useCallback(() => {
    setA11yStatus("Task completed");
    onComplete(task);
    onClose();
  }, [task, onComplete, onClose]);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress percentage for visual indicator
  const progressPercent = ((DEFAULT_FOCUS_TIME - timeRemaining) / DEFAULT_FOCUS_TIME) * 100;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center p-6 animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      {/* Live Region for Screen Readers */}
      <div className="sr-only" role="status" aria-live="polite">
        {a11yStatus}
      </div>

      {/* Exit Button */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-3 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-all duration-200"
        aria-label="Exit Focus Mode"
      >
        <X size={28} />
      </button>

      {/* Focus Mode Header */}
      <div className="absolute top-6 left-6 flex items-center gap-3 text-slate-400">
        <Target size={24} className="text-brand-500" />
        <span className="text-sm font-medium uppercase tracking-wider">Focus Mode</span>
      </div>

      {/* Progress Ring Background */}
      <div className="relative mb-8">
        {/* Circular progress indicator */}
        <svg className="w-80 h-80 -rotate-90" viewBox="0 0 100 100" aria-hidden="true">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="2"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={isTimerComplete ? '#10b981' : '#6366f1'}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={`${progressPercent * 2.83} 283`}
            className="transition-all duration-1000"
          />
        </svg>

        {/* Timer Display */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span 
            role="timer"
            className={`font-mono font-bold tracking-tight transition-all duration-300 ${
              isTimerComplete 
                ? 'text-6xl sm:text-7xl text-emerald-400 animate-pulse' 
                : 'text-7xl sm:text-9xl text-white'
            }`}
          >
            {isTimerComplete ? "Time's Up!" : formatTime(timeRemaining)}
          </span>
          {!isTimerComplete && (
            <span className="text-slate-500 text-sm mt-2" aria-hidden="true">
              {isRunning ? 'Stay focused...' : 'Paused'}
            </span>
          )}
        </div>
      </div>

      {/* Task Info */}
      <div className="text-center max-w-xl mb-12">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-3 leading-tight">
          {task.title}
        </h1>
        {task.description && (
          <p className="text-slate-400 text-base sm:text-lg line-clamp-3">
            {task.description}
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        {/* Pause/Resume Button */}
        <Button
          onClick={togglePause}
          className={`px-8 py-4 text-lg rounded-2xl transition-all duration-200 ${
            isRunning
              ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20'
              : 'bg-brand-500 hover:bg-brand-600 text-white shadow-lg shadow-brand-500/30'
          }`}
        >
          {isRunning ? (
            <>
              <Pause size={22} className="mr-2" /> Pause
            </>
          ) : (
            <>
              <Play size={22} className="mr-2" /> Resume
            </>
          )}
        </Button>

        {/* +5 Minutes Button */}
        <Button
          onClick={addFiveMinutes}
          variant="secondary"
          className="px-6 py-4 text-lg rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
        >
          <Plus size={20} className="mr-2" /> 5 min
        </Button>

        {/* Complete Task Button */}
        <Button
          onClick={handleComplete}
          className="px-8 py-4 text-lg rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-500/30 transition-all duration-200"
        >
          <CheckCircle2 size={22} className="mr-2" /> Complete Task
        </Button>
      </div>

      {/* Keyboard Shortcuts Hint */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-slate-600 text-xs">
        Press <kbd className="px-2 py-1 bg-white/10 rounded mx-1">Esc</kbd> to exit
      </div>
    </div>
  );
};

export default React.memo(FocusSession);
