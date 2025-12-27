import { ThemeOption } from './types';

// Theme-specific text translations for One Piece theme
export interface ThemeText {
    // Navigation
    dashboard: string;
    activities: string;
    tasks: string;
    reminders: string;
    events: string;
    appointments: string;
    calendar: string;
    budgetPlan: string;
    aiAssistant: string;
    settings: string;

    // Status
    todo: string;
    inProgress: string;
    done: string;

    // Priority
    priority: string;
    low: string;
    medium: string;
    high: string;

    // Budget
    budgetPlanner: string;
    remaining: string;
    income: string;
    totalBudget: string;
    expenses: string;
    treasury: string;

    // Sharing
    private: string;
    sharedWithPartner: string;

    // Location
    location: string;

    // Greeting
    greeting: (name: string) => string;

    // Progress
    progress: string;
    voyageProgress: string;

    // Task types display names
    taskType: string;
    eventType: string;
    appointmentType: string;
    reminderType: string;
}

const defaultText: ThemeText = {
    // Navigation
    dashboard: 'Dashboard',
    activities: 'Activities',
    tasks: 'Tasks',
    reminders: 'Reminders',
    events: 'Events',
    appointments: 'Appointments',
    calendar: 'Calendar',
    budgetPlan: 'Budget Plan',
    aiAssistant: 'AI Assistant',
    settings: 'Settings',

    // Status
    todo: 'Todo',
    inProgress: 'In Progress',
    done: 'Done',

    // Priority
    priority: 'Priority',
    low: 'Low',
    medium: 'Medium',
    high: 'High',

    // Budget
    budgetPlanner: 'Budget Planner',
    remaining: 'Remaining',
    income: 'Income',
    totalBudget: 'Total Budget',
    expenses: 'Expenses',
    treasury: 'Treasury',

    // Sharing
    private: 'Private',
    sharedWithPartner: 'Shared with Partner',

    // Location
    location: 'Location',

    // Greeting
    greeting: (name: string) => `Good Day, ${name}.`,

    // Progress
    progress: 'Progress',
    voyageProgress: 'Progress',

    // Task types display names
    taskType: 'Task',
    eventType: 'Event',
    appointmentType: 'Appointment',
    reminderType: 'Reminder',
};

const onepieceText: ThemeText = {
    // Navigation
    dashboard: "Captn's Deck",
    activities: "Captn's Log",
    tasks: 'Quests',
    reminders: 'Reminders',
    events: 'Events',
    appointments: 'Alliance Meetings',
    calendar: 'Calendar',
    budgetPlan: "Nami's Treasury",
    aiAssistant: 'Dr. Vegapunk',
    settings: 'Settings',

    // Status
    todo: 'Next Adventure',
    inProgress: 'Sailing',
    done: 'Conquered',

    // Priority
    priority: 'Threat Level',
    low: 'Low',
    medium: 'Medium',
    high: 'High',

    // Budget
    budgetPlanner: "Nami's Treasury",
    remaining: 'Treasury Left',
    income: 'Treasure',
    totalBudget: 'Total Treasure',
    expenses: 'Expenses',
    treasury: 'Treasury',

    // Sharing
    private: "Captain's Eyes Only",
    sharedWithPartner: 'Shared with Nakama',

    // Location
    location: 'Coordinates',

    // Greeting
    greeting: (name: string) => `Ahoy Captain ${name}!!`,

    // Progress
    progress: 'Voyage Progress',
    voyageProgress: 'Voyage Progress',

    // Task types display names
    taskType: 'Quest',
    eventType: 'Event',
    appointmentType: 'Alliance Meeting',
    reminderType: 'Reminder',
};

const themeTexts: Record<ThemeOption, ThemeText> = {
    light: defaultText,
    dark: defaultText,
    cyberpunk: defaultText,
    sunset: defaultText,
    onepiece: onepieceText,
};

export function getThemeText(theme: ThemeOption): ThemeText {
    return themeTexts[theme] || defaultText;
}

export function t(theme: ThemeOption, key: keyof Omit<ThemeText, 'greeting'>): string {
    const texts = getThemeText(theme);
    const value = texts[key];
    return typeof value === 'string' ? value : defaultText[key] as string;
}

export function getGreeting(theme: ThemeOption, name: string): string {
    const texts = getThemeText(theme);
    return texts.greeting(name);
}
