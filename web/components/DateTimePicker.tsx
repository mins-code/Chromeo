import React, { useState, useRef, useEffect } from 'react';
import { Calendar, Clock, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, isToday, setHours, setMinutes, getHours, getMinutes } from 'date-fns';

interface DateTimePickerProps {
  value: string; // ISO string or datetime-local format
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  showTimeSelect?: boolean;
  className?: string;
}

const DateTimePicker: React.FC<DateTimePickerProps> = ({
  value,
  onChange,
  label,
  placeholder = 'Select date & time',
  showTimeSelect = true,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (value) {
      return new Date(value);
    }
    return new Date();
  });
  const [selectedDate, setSelectedDate] = useState<Date | null>(() => {
    return value ? new Date(value) : null;
  });
  const [hours, setHoursState] = useState(() => {
    return value ? getHours(new Date(value)) : 9;
  });
  const [minutes, setMinutesState] = useState(() => {
    return value ? getMinutes(new Date(value)) : 0;
  });
  
  const containerRef = useRef<HTMLDivElement>(null);

  // Update internal state when value prop changes
  useEffect(() => {
    if (value) {
      const date = new Date(value);
      setSelectedDate(date);
      setCurrentMonth(date);
      setHoursState(getHours(date));
      setMinutesState(getMinutes(date));
    }
  }, [value]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDaysInMonth = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  };

  const getStartDayOfWeek = () => {
    return startOfMonth(currentMonth).getDay();
  };

  const handleDateSelect = (date: Date) => {
    const newDate = setMinutes(setHours(date, hours), minutes);
    setSelectedDate(newDate);
    emitChange(newDate);
  };

  const handleTimeChange = (newHours: number, newMinutes: number) => {
    setHoursState(newHours);
    setMinutesState(newMinutes);
    
    if (selectedDate) {
      const newDate = setMinutes(setHours(selectedDate, newHours), newMinutes);
      setSelectedDate(newDate);
      emitChange(newDate);
    }
  };

  const emitChange = (date: Date) => {
    // Format as datetime-local compatible string
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hrs = String(date.getHours()).padStart(2, '0');
    const mins = String(date.getMinutes()).padStart(2, '0');
    onChange(`${year}-${month}-${day}T${hrs}:${mins}`);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDate(null);
    onChange('');
  };

  const formatDisplayValue = () => {
    if (!selectedDate) return '';
    return format(selectedDate, showTimeSelect ? 'MMM d, yyyy • h:mm a' : 'MMM d, yyyy');
  };

  const days = getDaysInMonth();
  const startPadding = getStartDayOfWeek();

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
          <Calendar size={16} className="text-brand-500" />
          {label}
        </label>
      )}
      
      {/* Input Display */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-800 dark:text-slate-200 cursor-pointer hover:border-brand-500/50 transition-colors flex items-center justify-between group"
      >
        <div className="flex items-center gap-3">
          <Calendar size={18} className="text-slate-400 group-hover:text-brand-500 transition-colors" />
          <span className={selectedDate ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'}>
            {formatDisplayValue() || placeholder}
          </span>
        </div>
        {selectedDate && (
          <button
            onClick={handleClear}
            className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Dropdown Picker */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-scale-in w-full min-w-[320px]">
          {/* Calendar Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {format(currentMonth, 'MMMM yyyy')}
            </span>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="p-4">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
                <div key={day} className="text-center text-xs font-semibold text-slate-400 dark:text-slate-500 py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {/* Empty cells for padding */}
              {Array.from({ length: startPadding }).map((_, i) => (
                <div key={`pad-${i}`} className="aspect-square" />
              ))}
              
              {days.map((day) => {
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isTodayDate = isToday(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => handleDateSelect(day)}
                    className={`aspect-square rounded-lg text-sm font-medium transition-all flex items-center justify-center
                      ${isSelected 
                        ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30' 
                        : isTodayDate 
                          ? 'bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/30' 
                          : isCurrentMonth 
                            ? 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800' 
                            : 'text-slate-400 dark:text-slate-600'
                      }
                    `}
                  >
                    {format(day, 'd')}
                  </button>
                );
              })}
            </div>

            {/* Time Picker */}
            {showTimeSelect && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <Clock size={16} className="text-slate-400" />
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Time</span>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  {/* Hours */}
                  <select
                    value={hours}
                    onChange={(e) => handleTimeChange(parseInt(e.target.value), minutes)}
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                  >
                    {Array.from({ length: 24 }).map((_, i) => (
                      <option key={i} value={i}>
                        {String(i).padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                  <span className="text-slate-400 font-bold">:</span>
                  {/* Minutes */}
                  <select
                    value={minutes}
                    onChange={(e) => handleTimeChange(hours, parseInt(e.target.value))}
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                  >
                    {Array.from({ length: 60 }).map((_, i) => (
                      <option key={i} value={i}>
                        {String(i).padStart(2, '0')}
                      </option>
                    ))}
                  </select>
                  {/* AM/PM display */}
                  <span className="px-3 py-2 text-sm font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    {hours >= 12 ? 'PM' : 'AM'}
                  </span>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => {
                  const now = new Date();
                  setCurrentMonth(now);
                  handleDateSelect(now);
                }}
                className="flex-1 py-2 text-sm font-medium text-brand-600 dark:text-brand-400 bg-brand-500/10 hover:bg-brand-500/20 rounded-lg transition-colors"
              >
                Now
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateTimePicker;
