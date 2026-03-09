import React, { useState, useRef, useEffect, useId } from 'react';
import {
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  Keyboard,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  isToday,
  setHours,
  setMinutes,
  getHours,
  getMinutes,
  parse,
  isValid,
  addDays,
} from 'date-fns';

interface DateTimePickerProps {
  value: string;
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
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'picker' | 'type'>('picker');
  const [typeValue, setTypeValue] = useState('');
  const [currentMonth, setCurrentMonth] = useState(() => (value ? new Date(value) : new Date()));
  const [selectedDate, setSelectedDate] = useState<Date | null>(() =>
    value ? new Date(value) : null
  );

  // Generate unique ID for accessibility
  const generatedId = useId();
  const triggerId = `date-picker-${generatedId}`;

  // 12-hour format state
  const [hour12, setHour12] = useState(() => {
    if (value) {
      const h = getHours(new Date(value));
      return h === 0 ? 12 : h > 12 ? h - 12 : h;
    }
    return 9;
  });
  const [minutes, setMinutesState] = useState(() => (value ? getMinutes(new Date(value)) : 0));
  const [isPM, setIsPM] = useState(() => (value ? getHours(new Date(value)) >= 12 : false));

  const containerRef = useRef<HTMLDivElement>(null);
  const typeInputRef = useRef<HTMLInputElement>(null);
  const labelId = useId();

  // Convert 12h to 24h
  const get24Hour = (h12: number, pm: boolean) => {
    if (h12 === 12) return pm ? 12 : 0;
    return pm ? h12 + 12 : h12;
  };

  useEffect(() => {
    if (value) {
      const date = new Date(value);
      const h = getHours(date);
      setSelectedDate(date);
      setCurrentMonth(date);
      setHour12(h === 0 ? 12 : h > 12 ? h - 12 : h);
      setMinutesState(getMinutes(date));
      setIsPM(h >= 12);
    }
  }, [value]);

  useEffect(() => {
    if (mode === 'type' && typeInputRef.current) typeInputRef.current.focus();
  }, [mode]);

  // Focus management for keyboard navigation
  useEffect(() => {
    if (isOpen && mode === 'picker' && selectedDate) {
      const btn = document.getElementById(`date-${format(selectedDate, 'yyyy-MM-dd')}`);
      if (btn) btn.focus();
    }
  }, [selectedDate, isOpen, mode, currentMonth]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node))
        setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDaysInMonth = () =>
    eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const getStartDayOfWeek = () => startOfMonth(currentMonth).getDay();

  const handleDateSelect = (date: Date) => {
    const h24 = get24Hour(hour12, isPM);
    const newDate = setMinutes(setHours(date, h24), minutes);
    setSelectedDate(newDate);
    emitChange(newDate);
  };

  const handleDayKeyDown = (e: React.KeyboardEvent, day: Date) => {
    const directions = { ArrowRight: 1, ArrowLeft: -1, ArrowUp: -7, ArrowDown: 7 };
    if (e.key in directions) {
      e.preventDefault();
      const newDate = addDays(day, directions[e.key as keyof typeof directions]);
      handleDateSelect(newDate);
      if (!isSameMonth(newDate, currentMonth)) setCurrentMonth(newDate);
    }
  };

  const handleTimeChange = (newH12: number, newMin: number, newPM: boolean) => {
    setHour12(newH12);
    setMinutesState(newMin);
    setIsPM(newPM);

    if (selectedDate) {
      const h24 = get24Hour(newH12, newPM);
      const newDate = setMinutes(setHours(selectedDate, h24), newMin);
      setSelectedDate(newDate);
      emitChange(newDate);
    }
  };

  const emitChange = (date: Date) => {
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

  const handleTypeSubmit = () => {
    if (!typeValue.trim()) return;
    const formats = [
      'dd/MM/yyyy HH:mm',
      'dd-MM-yyyy HH:mm',
      'MM/dd/yyyy HH:mm',
      'yyyy-MM-dd HH:mm',
      'dd/MM/yyyy h:mm a',
      'dd MMM yyyy HH:mm',
      'MMM dd, yyyy HH:mm',
      'dd/MM/yyyy',
      'dd-MM-yyyy',
      'MM/dd/yyyy',
      'yyyy-MM-dd',
    ];
    let parsed: Date | null = null;
    for (const fmt of formats) {
      const result = parse(typeValue, fmt, new Date());
      if (isValid(result)) {
        parsed = result;
        break;
      }
    }
    if (parsed) {
      setSelectedDate(parsed);
      setCurrentMonth(parsed);
      const h = getHours(parsed);
      setHour12(h === 0 ? 12 : h > 12 ? h - 12 : h);
      setMinutesState(getMinutes(parsed));
      setIsPM(h >= 12);
      emitChange(parsed);
      setTypeValue('');
      setMode('picker');
      setIsOpen(false);
    }
  };

  const formatDisplayValue = () => {
    if (!selectedDate) return '';
    return format(selectedDate, showTimeSelect ? 'MMM d, yyyy • h:mm a' : 'MMM d, yyyy');
  };

  const days = getDaysInMonth();
  const startPadding = getStartDayOfWeek();

  // Calculate focus target for roving tabindex
  const getFocusDate = () => {
    if (selectedDate && isSameMonth(selectedDate, currentMonth)) return selectedDate;
    const today = new Date();
    if (isSameMonth(today, currentMonth)) return today;
    return startOfMonth(currentMonth);
  };
  const focusDate = getFocusDate();

  // Spinner component for time - now with direct input
  const TimeSpinner = ({
    value,
    onChange,
    min,
    max,
    step = 1,
    display,
  }: {
    value: number;
    onChange: (v: number) => void;
    min: number;
    max: number;
    step?: number;
    display?: (v: number) => string;
  }) => {
    const [inputValue, setInputValue] = useState(
      display ? display(value) : String(value).padStart(2, '0')
    );

    // Sync inputValue when value prop changes
    useEffect(() => {
      setInputValue(display ? display(value) : String(value).padStart(2, '0'));
    }, [value, display]);

    const handleWheel = (e: React.WheelEvent) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        // Scrolling up - increment
        onChange(value >= max ? min : value + step);
      } else {
        // Scrolling down - decrement
        onChange(value <= min ? max : value - step);
      }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      // Allow only numeric input (and empty string while typing)
      if (/^\d*$/.test(val)) {
        setInputValue(val);
      }
    };

    const handleInputBlur = () => {
      const parsed = parseInt(inputValue, 10);
      if (!isNaN(parsed)) {
        // Clamp value within bounds
        const clamped = Math.max(min, Math.min(max, parsed));
        onChange(clamped);
      } else {
        // Reset to current value if invalid
        setInputValue(display ? display(value) : String(value).padStart(2, '0'));
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        (e.target as HTMLInputElement).blur();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        onChange(value >= max ? min : value + step);
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onChange(value <= min ? max : value - step);
      }
    };

    return (
      <div
        className="flex flex-col items-center gap-0.5"
        onWheel={handleWheel}
        title="Scroll or type to change value"
      >
        <button
          onClick={() => onChange(value >= max ? min : value + step)}
          className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          type="button"
          aria-label="Increment"
        >
          <ChevronUp size={14} />
        </button>
        <input
          type="text"
          inputMode="numeric"
          value={inputValue}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          onFocus={(e) => e.target.select()}
          className="w-10 h-7 text-center text-sm font-semibold text-white bg-white/10 rounded border-none focus:outline-none focus:ring-2 focus:ring-brand-500/50"
          aria-label="Enter time value"
        />
        <button
          onClick={() => onChange(value <= min ? max : value - step)}
          className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          type="button"
          aria-label="Decrement"
        >
          <ChevronDown size={14} />
        </button>
      </div>
    );
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label
          htmlFor={triggerId}
          className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-300 mb-2"
        >
          <Calendar size={16} className="text-brand-500" />
          {label}
        </label>
      )}

      <div className="relative w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center group focus-within:ring-2 focus-within:ring-brand-500/50 focus-within:border-brand-500 transition-colors hover:border-brand-500/50">
        <button
          id={triggerId}
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setIsOpen(true);
            }
          }}
          className="flex-1 px-3 py-2.5 text-sm text-left flex items-center gap-2 bg-transparent border-none rounded-l-xl focus:outline-none"
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          aria-label={label || placeholder}
        >
          <Calendar
            size={16}
            className="text-slate-400 group-hover:text-brand-500 transition-colors flex-shrink-0"
          />
          <span
            className={`truncate ${selectedDate ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400'}`}
          >
            {formatDisplayValue() || placeholder}
          </span>
        </button>

        {selectedDate && (
          <button
            type="button"
            onClick={handleClear}
            className="p-2 mr-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors flex-shrink-0"
            aria-label="Clear date"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 top-full left-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-scale-in w-full min-w-[280px]">
          {/* Mode Toggle */}
          <div className="flex border-b border-slate-700">
            <button
              onClick={() => setMode('picker')}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${mode === 'picker' ? 'bg-brand-500/20 text-brand-400' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              <Calendar size={12} className="inline mr-1" /> Pick
            </button>
            <button
              onClick={() => setMode('type')}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${mode === 'type' ? 'bg-brand-500/20 text-brand-400' : 'text-slate-400 hover:bg-slate-800'}`}
            >
              <Keyboard size={12} className="inline mr-1" /> Type
            </button>
          </div>

          {mode === 'type' ? (
            <div className="p-3">
              <input
                ref={typeInputRef}
                type="text"
                value={typeValue}
                onChange={(e) => setTypeValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTypeSubmit()}
                placeholder="e.g. 15/01/2026 2:30 PM"
                className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
              />
              <p className="mt-2 text-[10px] text-slate-500">
                Formats: dd/mm/yyyy hh:mm, Jan 15, 2026 14:30
              </p>
              <button
                onClick={handleTypeSubmit}
                className="w-full mt-2 py-2 text-xs font-medium bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
              >
                Apply
              </button>
            </div>
          ) : (
            <div className="p-3">
              {/* Calendar Header */}
              <div className="flex items-center justify-between mb-2">
                <button
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors"
                  aria-label="Previous month"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm font-semibold text-white">
                  {format(currentMonth, 'MMM yyyy')}
                </span>
                <button
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 transition-colors"
                  aria-label="Next month"
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Weekday Headers */}
              <div className="grid grid-cols-7 gap-0.5 mb-1">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                  <div
                    key={i}
                    className="text-center text-[10px] font-semibold text-slate-500 py-1"
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-0.5">
                {Array.from({ length: startPadding }).map((_, i) => (
                  <div key={`pad-${i}`} className="w-8 h-8" />
                ))}
                {days.map((day) => {
                  const isSelected = selectedDate && isSameDay(day, selectedDate);
                  const isTodayDate = isToday(day);
                  const isCurrentMonth = isSameMonth(day, currentMonth);
                  const isFocusable = isSameDay(day, focusDate);
                  return (
                    <button
                      key={day.toISOString()}
                      id={`date-${format(day, 'yyyy-MM-dd')}`}
                      tabIndex={isFocusable ? 0 : -1}
                      onKeyDown={(e) => handleDayKeyDown(e, day)}
                      onClick={() => handleDateSelect(day)}
                      className={`w-8 h-8 rounded-md text-xs font-medium transition-all flex items-center justify-center outline-none focus:ring-2 focus:ring-brand-500 focus:z-10
                        ${isSelected ? 'bg-brand-500 text-white font-bold ring-2 ring-brand-400 shadow-lg shadow-brand-500/50' : isTodayDate ? 'bg-brand-500/20 text-brand-400' : isCurrentMonth ? 'text-slate-300 hover:bg-slate-800' : 'text-slate-600'}
                      `}
                    >
                      {format(day, 'd')}
                    </button>
                  );
                })}
              </div>

              {/* Time Picker - 12h format with AM/PM toggle */}
              {showTimeSelect && (
                <div className="mt-3 pt-3 border-t border-slate-700">
                  <div className="flex items-center justify-center gap-3">
                    <Clock size={14} className="text-slate-400" />
                    <TimeSpinner
                      value={hour12}
                      onChange={(v) => handleTimeChange(v, minutes, isPM)}
                      min={1}
                      max={12}
                    />
                    <span className="text-white font-bold">:</span>
                    <TimeSpinner
                      value={minutes}
                      onChange={(v) => handleTimeChange(hour12, v, isPM)}
                      min={0}
                      max={55}
                      step={5}
                    />
                    {/* AM/PM Toggle */}
                    <button
                      onClick={() => handleTimeChange(hour12, minutes, !isPM)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all bg-brand-500 text-slate-900"
                      aria-label={isPM ? 'Switch to AM' : 'Switch to PM'}
                    >
                      {isPM ? 'PM' : 'AM'}
                    </button>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => {
                    const now = new Date();
                    setCurrentMonth(now);
                    const h = getHours(now);
                    setHour12(h === 0 ? 12 : h > 12 ? h - 12 : h);
                    setMinutesState(getMinutes(now));
                    setIsPM(h >= 12);
                    handleDateSelect(now);
                  }}
                  className="flex-1 py-1.5 text-xs font-medium text-brand-400 bg-brand-500/10 hover:bg-brand-500/20 rounded-md transition-colors"
                >
                  Now
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex-1 py-1.5 text-xs font-medium text-slate-400 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DateTimePicker;
