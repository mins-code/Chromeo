/**
 * Barrel exports for commonly used components
 * Enables cleaner imports: import { Button, TaskCard } from './components';
 */

// UI Primitives
export { default as Button } from './Button';
export { default as Input } from './Input';
export { default as Select } from './Select';

// Task Components
export { default as TaskCard } from './TaskCard';
export { default as TaskEditor } from './TaskEditor';
export { default as DraggableTask } from './DraggableTask';

// Calendar Components
export { default as CalendarView } from './CalendarView';
export { default as DayView } from './DayView';
export { default as WeekView } from './WeekView';
export { default as CustomIntervalView } from './CustomIntervalView';
export { default as MiniCalendar } from './MiniCalendar';
export { default as CalendarDayCell } from './CalendarDayCell';
export { default as DateTimePicker } from './DateTimePicker';

// Budget Components
export { default as BudgetPlanner } from './BudgetPlanner';
export { default as TransactionList } from './TransactionList';

// Routine Components
export { default as RoutineList } from './RoutineList';
export { default as RoutineEditor } from './RoutineEditor';

// Notes & AI
export { default as NotesManager } from './NotesManager';
export { default as AIChat } from './AIChat';

// Modals
export { default as CommandBar } from './CommandBar';
export { default as DeleteAccountModal } from './DeleteAccountModal';
export { default as CollaborationSettings } from './CollaborationSettings';
export { default as CloneDayModal } from './CloneDayModal';
export { default as RecurringPlanModal } from './RecurringPlanModal';

// Auth & Error
export { default as Auth } from './Auth';
export { default as ErrorBoundary } from './ErrorBoundary';

// Stats
export { default as Stats } from './Stats';

// Layout (named export)
export { Layout } from './Layout';

