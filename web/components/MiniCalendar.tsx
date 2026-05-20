import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import type { ThemeOption } from '../types';

interface MiniCalendarProps {
  currentTheme: ThemeOption;
  isExpanded: boolean;
  onDateSelect?: (date: Date) => void;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const MiniCalendar: React.FC<MiniCalendarProps> = ({ currentTheme, isExpanded, onDateSelect }) => {
  const today = new Date();
  const [currentDate, setCurrentDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [showPicker, setShowPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(currentDate.getFullYear());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get first day of month and number of days
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Navigate months
  const goToPrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Select month/year from picker
  const selectMonth = (selectedMonth: number) => {
    setCurrentDate(new Date(pickerYear, selectedMonth, 1));
    setShowPicker(false);
  };

  const handleDateClick = (day: number) => {
    if (onDateSelect) {
      onDateSelect(new Date(year, month, day));
    }
  };

  // Generate calendar grid
  const generateCalendarDays = () => {
    const days: { day: number; isCurrentMonth: boolean; isToday: boolean }[] = [];

    // Previous month's trailing days
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      days.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        isToday: false
      });
    }

    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const isToday = 
        i === today.getDate() && 
        month === today.getMonth() && 
        year === today.getFullYear();
      days.push({
        day: i,
        isCurrentMonth: true,
        isToday
      });
    }

    // Next month's leading days to complete the grid
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        day: i,
        isCurrentMonth: false,
        isToday: false
      });
    }

    return days;
  };

  const calendarDays = generateCalendarDays();

  // Theme-specific colors
  const getThemeColors = () => {
    switch (currentTheme) {
      case 'cyberpunk':
        return {
          text: 'text-[#E0FFFF]',
          textMuted: 'text-[#00FFFF]/50',
          accent: 'bg-[#00FFFF]',
          accentText: 'text-[#0a0014]',
          hover: 'hover:bg-[#00FFFF]/10',
          border: 'border-[#00FFFF]/20',
          headerBg: 'bg-[#00FFFF]/5'
        };
      case 'sunset':
        return {
          text: 'text-rose-50',
          textMuted: 'text-rose-200/70', /* Improved: brighter for better visibility */
          accent: 'bg-rose-500',
          accentText: 'text-white',
          hover: 'hover:bg-rose-500/15',
          border: 'border-rose-400/30',
          headerBg: 'bg-rose-500/10'
        };
      case 'onepiece':
        return {
          text: 'text-[#E8DCD0]',
          textMuted: 'text-[#D4A574]/50',
          accent: 'bg-[#D4A574]',
          accentText: 'text-[#0A0A0A]',
          hover: 'hover:bg-[#D4A574]/10',
          border: 'border-[#D4A574]/20',
          headerBg: 'bg-[#D4A574]/5'
        };
      case 'light':
        return {
          text: 'text-slate-800',
          textMuted: 'text-slate-400',
          accent: 'bg-brand-500',
          accentText: 'text-white',
          hover: 'hover:bg-slate-100',
          border: 'border-slate-200',
          headerBg: 'bg-slate-50'
        };
      default: // dark
        return {
          text: 'text-slate-200',
          textMuted: 'text-slate-400',
          accent: 'bg-brand-500',
          accentText: 'text-slate-900',
          hover: 'hover:bg-white/5',
          border: 'border-white/10',
          headerBg: 'bg-white/5'
        };
    }
  };

  const colors = getThemeColors();

  if (!isExpanded) {
    // Collapsed view - just show current day number
    return (
      <div className="flex flex-col items-center py-3">
        <div className={`w-10 h-10 rounded-xl ${colors.accent} ${colors.accentText} flex items-center justify-center font-bold text-lg shadow-lg`}>
          {today.getDate()}
        </div>
      </div>
    );
  }

  return (
    <div className={`px-3 py-4 border-b ${colors.border}`}>
      {/* Header with Month/Year and Navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => {
            setPickerYear(year);
            setShowPicker(!showPicker);
          }}
          className={`flex items-center gap-1 text-sm font-semibold ${colors.text} ${colors.hover} rounded-lg px-2 py-1 transition-colors`}
          aria-expanded={showPicker}
          aria-label={`Select month and year. Currently ${MONTHS[month]} ${year}`}
        >
          {MONTHS[month]} {year}
          <ChevronDown size={14} className={`transition-transform ${showPicker ? 'rotate-180' : ''}`} />
        </button>
        
        <div className="flex items-center gap-1">
          <button
            onClick={goToPrevMonth}
            className={`p-1.5 rounded-lg ${colors.textMuted} ${colors.hover} transition-colors`}
            aria-label="Previous month"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={goToNextMonth}
            className={`p-1.5 rounded-lg ${colors.textMuted} ${colors.hover} transition-colors`}
            aria-label="Next month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Month/Year Picker Dropdown */}
      {showPicker && (
        <div className={`mb-3 p-3 rounded-xl ${colors.headerBg} border ${colors.border} animate-fade-in`}>
          {/* Year Selector with Decade Navigation + Manual Input */}
          <div className="mb-3">
            {/* Year Range Navigation */}
            <div className="flex items-center justify-between mb-2">
              <button
                onClick={() => setPickerYear(pickerYear - 12)}
                className={`p-1 rounded ${colors.textMuted} ${colors.hover}`}
                title="Previous 12 years"
                aria-label="Previous 12 years"
              >
                <ChevronLeft size={14} />
              </button>
              
              {/* Manual Year Input */}
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={pickerYear}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val) && val >= 1900 && val <= 2100) {
                      setPickerYear(val);
                    }
                  }}
                  onBlur={(e) => {
                    const val = parseInt(e.target.value);
                    if (isNaN(val) || val < 1900) setPickerYear(1900);
                    if (val > 2100) setPickerYear(2100);
                  }}
                  className={`w-16 text-center text-sm font-bold ${colors.text} bg-transparent border-b-2 ${colors.border} focus:outline-none focus:border-brand-500 transition-colors`}
                  min={1900}
                  max={2100}
                />
              </div>
              
              <button
                onClick={() => setPickerYear(pickerYear + 12)}
                className={`p-1 rounded ${colors.textMuted} ${colors.hover}`}
                title="Next 12 years"
                aria-label="Next 12 years"
              >
                <ChevronRight size={14} />
              </button>
            </div>
            
            {/* Year Grid - 12 years at a time */}
            <div className="grid grid-cols-4 gap-1 mb-3">
              {Array.from({ length: 12 }, (_, i) => {
                const yearOffset = Math.floor(pickerYear / 12) * 12;
                const displayYear = yearOffset + i;
                const isCurrentYear = displayYear === year;
                const isSelectedYear = displayYear === pickerYear;
                return (
                  <button
                    key={displayYear}
                    onClick={() => setPickerYear(displayYear)}
                    className={`px-2 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                      isSelectedYear
                        ? `${colors.accent} ${colors.accentText}`
                        : isCurrentYear
                          ? `ring-1 ring-brand-500 ${colors.text}`
                          : `${colors.text} ${colors.hover}`
                    }`}
                  >
                    {displayYear}
                  </button>
                );
              })}
            </div>
          </div>
          
          {/* Month Grid */}
          <div className="grid grid-cols-3 gap-1">
            {MONTHS.map((m, idx) => {
              const isCurrentMonth = idx === month && pickerYear === year;
              return (
                <button
                  key={m}
                  onClick={() => selectMonth(idx)}
                  className={`px-2 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                    isCurrentMonth
                      ? `${colors.accent} ${colors.accentText}`
                      : `${colors.text} ${colors.hover}`
                  }`}
                >
                  {m.slice(0, 3)}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Day Headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DAYS.map(day => (
          <div
            key={day}
            className={`text-center text-[10px] font-semibold ${colors.textMuted} py-1`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {calendarDays.slice(0, 35).map((dayInfo, index) => (
          <button
            key={index}
            onClick={() => dayInfo.isCurrentMonth && handleDateClick(dayInfo.day)}
            className={`aspect-square flex items-center justify-center text-xs rounded-lg transition-all ${
              dayInfo.isToday
                ? `${colors.accent} ${colors.accentText} font-bold shadow-md`
                : dayInfo.isCurrentMonth
                  ? `${colors.text} ${colors.hover} font-medium`
                  : `${colors.textMuted} opacity-60`
            }`}
          >
            {dayInfo.day}
          </button>
        ))}
      </div>
    </div>
  );
};

export default React.memo(MiniCalendar);
