import React, { useState, useRef, useEffect } from 'react';
import { Clock, ChevronUp, ChevronDown } from 'lucide-react';

interface TimePickerDropdownProps {
  value: string; // HH:mm format (24-hour)
  onChange: (value: string) => void;
  label?: string;
  className?: string;
}

const TimePickerDropdown: React.FC<TimePickerDropdownProps> = ({
  value,
  onChange,
  label,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse value into 12-hour format
  const [hours24, minutes] = value.split(':').map(Number);
  const isPM = hours24 >= 12;
  const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTimeChange = (newH12: number, newMin: number, newPM: boolean) => {
    // Convert to 24-hour format
    let h24 = newH12;
    if (newH12 === 12) {
      h24 = newPM ? 12 : 0;
    } else {
      h24 = newPM ? newH12 + 12 : newH12;
    }
    const formatted = `${String(h24).padStart(2, '0')}:${String(newMin).padStart(2, '0')}`;
    onChange(formatted);
  };

  const formatDisplayValue = () => {
    return `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${isPM ? 'PM' : 'AM'}`;
  };

  // Time Spinner Component
  const TimeSpinner = ({ 
    value, 
    onChange, 
    min, 
    max, 
    step = 1, 
    display 
  }: { 
    value: number; 
    onChange: (v: number) => void; 
    min: number; 
    max: number; 
    step?: number; 
    display?: (v: number) => string;
  }) => {
    const handleWheel = (e: React.WheelEvent) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        onChange(value >= max ? min : value + step);
      } else {
        onChange(value <= min ? max : value - step);
      }
    };

    return (
      <div 
        className="flex flex-col items-center gap-0.5 cursor-ns-resize" 
        onWheel={handleWheel}
        title="Scroll to change value"
      >
        <button
          type="button"
          onClick={() => onChange(value >= max ? min : value + step)}
          className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronUp size={14} />
        </button>
        <span className="w-8 h-7 flex items-center justify-center text-sm font-semibold text-white bg-white/10 rounded">
          {display ? display(value) : String(value).padStart(2, '0')}
        </span>
        <button
          type="button"
          onClick={() => onChange(value <= min ? max : value - step)}
          className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronDown size={14} />
        </button>
      </div>
    );
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
          <Clock size={16} className="text-blue-500" />
          {label}
        </label>
      )}

      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 cursor-pointer hover:border-emerald-500/50 transition-colors flex items-center justify-between group"
      >
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
          <span>{formatDisplayValue()}</span>
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-scale-in p-4">
          <div className="flex items-center justify-center gap-3">
            <Clock size={14} className="text-slate-400" />
            <TimeSpinner 
              value={hours12} 
              onChange={(v) => handleTimeChange(v, minutes, isPM)} 
              min={1} 
              max={12} 
            />
            <span className="text-white font-bold">:</span>
            <TimeSpinner 
              value={minutes} 
              onChange={(v) => handleTimeChange(hours12, v, isPM)} 
              min={0} 
              max={55} 
              step={5} 
            />
            <button
              type="button"
              onClick={() => handleTimeChange(hours12, minutes, !isPM)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-emerald-500 text-slate-900 hover:bg-emerald-600"
            >
              {isPM ? 'PM' : 'AM'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimePickerDropdown;
