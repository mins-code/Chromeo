import React, { useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { ThemeOption, NotificationSettings, NotificationSound } from '../types';
import { useTheme } from '../context/ThemeContext';
import Input from '../components/Input';
import Button from '../components/Button';
import Select from '../components/Select';
import CollaborationSettings from '../components/CollaborationSettings';
import DeleteAccountModal from '../components/DeleteAccountModal';
import * as NotificationService from '../services/notificationService';
import { isNativePlatform, openNativeAppSettings } from '../utils/device';
import {
  User,
  Palette,
  Bell,
  LogOut,
  Moon,
  Sun,
  Zap,
  Anchor,
  CheckCircle2,
  CheckSquare,
  CalendarDays,
  AlertCircle,
  AlertTriangle,
  Trash2,
  Link2,
  ExternalLink,
  Terminal,
  Settings,
  Mail,
  Volume2,
} from 'lucide-react';

interface SettingsPageProps {
  session: Session | null;
  username: string;
  onUsernameChange: (name: string) => void;
  onSignOut: () => void;
  notificationSettings: NotificationSettings;
  notificationPermission: NotificationPermission | 'unsupported';
  onNotificationToggle: (enabled: boolean) => void;
  onNotificationPreferenceChange: (key: keyof NotificationSettings, value: boolean | number | string) => void;
  onNavigate: (path: string) => void;
  // Google Calendar Integration
  googleCalendarEnabled?: boolean;
  hasGoogleToken?: boolean;
  onGoogleCalendarToggle?: (enabled: boolean) => void;
}

/**
 * Settings Page Component
 * Handles user profile, appearance, notifications, and account management
 */
const SettingsPage: React.FC<SettingsPageProps> = ({
  session,
  username,
  onUsernameChange,
  onSignOut,
  notificationSettings,
  notificationPermission,
  onNotificationToggle,
  onNotificationPreferenceChange,
  onNavigate,
  googleCalendarEnabled = false,
  hasGoogleToken = false,
  onGoogleCalendarToggle,
}) => {
  const { theme, setTheme } = useTheme();
  const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
  const [customReminderUnit, setCustomReminderUnit] = useState<'minutes' | 'hours' | 'days'>('minutes');

  const themes: ThemeOption[] = ['dark', 'light', 'cyberpunk', 'sunset', 'onepiece'];

  const getThemeIcon = (t: ThemeOption) => {
    switch (t) {
      case 'dark':
        return <Moon className="text-[#E0E0E0]" />;
      case 'light':
        return <Sun className="text-orange-400" />;
      case 'cyberpunk':
        return <Zap className="text-[#00FFFF]" />;
      case 'sunset':
        return <Sun className="text-rose-400" />;
      case 'onepiece':
        return <Anchor className="text-[#D4A574]" />;
    }
  };

  const getThemeBackground = (t: ThemeOption) => {
    switch (t) {
      case 'dark':
        return 'bg-[#000000] border-white/15';
      case 'light':
        return 'bg-slate-50 border-slate-200';
      case 'cyberpunk':
        return 'bg-[#0a0014] border-[#00FFFF]/30';
      case 'sunset':
        return 'bg-[#4c0519] border-rose-500/30';
      case 'onepiece':
        return 'bg-[#0A0A0A] border-[#D4A574]/30';
    }
  };

  /** Reusable section header */
  const SectionHeader = ({ icon, label }: { icon: React.ReactNode; label: string }) => (
    <div className="flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">
      <span className="text-brand-500">{icon}</span>
      <h3>{label}</h3>
    </div>
  );

  /** Reusable card container */
  const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
    <div className={`bg-white/40 dark:bg-dark-surface/30 border border-slate-200 dark:border-white/5 rounded-2xl p-6 backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );

  /** Reusable toggle switch */
  const Toggle = ({
    checked,
    onChange,
    disabled = false,
    color = 'brand',
    ariaLabel,
  }: {
    checked: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
    color?: 'brand' | 'blue';
    ariaLabel: string;
  }) => (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative w-14 h-7 rounded-full transition-colors duration-200 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
        color === 'blue'
          ? `focus-visible:ring-blue-500 ${checked ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'}`
          : `focus-visible:ring-brand-500 ${checked ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-600'}`
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
    >
      <span className="sr-only">{ariaLabel}</span>
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute top-1 left-1 w-5 h-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out ${
          checked ? 'translate-x-7' : 'translate-x-0'
        }`}
      />
    </button>
  );

  return (
    <div className="space-y-8 animate-fade-in h-full flex flex-col">
      {/* Page Header */}
      <header className="border-b border-slate-200 dark:border-white/5 pb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-500">
            <Settings size={20} />
          </div>
          <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Settings</h2>
        </div>
        <p className="text-slate-500 dark:text-slate-400 ml-[52px]">
          Manage your preferences, account, and team.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-y-auto pb-20">

        {/* ── Profile ── */}
        <div className="col-span-1 lg:col-span-2 space-y-4">
          <SectionHeader icon={<User size={22} />} label="Profile" />
          <Card>
            <div className="flex flex-col sm:flex-row sm:items-start gap-6">
              {/* Avatar */}
              <div className="shrink-0">
                <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-500 text-2xl font-bold select-none">
                  {username ? username[0].toUpperCase() : '?'}
                </div>
              </div>
              {/* Fields */}
              <div className="flex-1 space-y-4 min-w-0">
                <Input
                  label="Display Name / Nickname"
                  value={username}
                  onChange={(e) => onUsernameChange(e.target.value)}
                  placeholder="How should we call you?"
                />
                {/* Email + Sign Out row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-sm min-w-0">
                    <Mail size={15} className="shrink-0" />
                    <span className="truncate">{session?.user?.email}</span>
                  </div>
                  <Button
                    variant="secondary"
                    onClick={onSignOut}
                    className="w-auto border-red-500/20 text-red-500 hover:bg-red-500/10 shrink-0"
                  >
                    <LogOut size={15} className="mr-2" /> Sign Out
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* ── Appearance ── */}
        <div className="col-span-1 lg:col-span-2 space-y-4 pt-2">
          <SectionHeader icon={<Palette size={22} />} label="Appearance" />
          <Card>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
              Choose a theme that suits your style.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {themes.map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`relative p-4 rounded-xl border-2 transition-all group overflow-hidden ${
                    theme === t
                      ? 'border-brand-500 bg-brand-500/5'
                      : 'border-slate-200 dark:border-white/10 hover:border-brand-500/50'
                  }`}
                >
                  <div
                    className={`h-20 rounded-lg mb-3 border shadow-inner flex items-center justify-center ${getThemeBackground(t)}`}
                  >
                    {getThemeIcon(t)}
                  </div>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-200 capitalize">{t}</p>
                  {theme === t && (
                    <div className="absolute top-2 right-2 text-brand-500">
                      <CheckCircle2 size={16} />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* ── Notifications ── */}
        <div className="col-span-1 lg:col-span-2 space-y-4 pt-2">
          <SectionHeader icon={<Bell size={22} />} label="Notifications" />
          <Card className="space-y-5">

            {/* Main Toggle */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="font-semibold text-slate-800 dark:text-slate-100">Enable Notifications</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Get notified about tasks, events, and budget alerts
                </p>
              </div>
              <Toggle
                checked={notificationSettings.enabled}
                onChange={(v) => notificationPermission !== 'denied' && onNotificationToggle(v)}
                disabled={notificationPermission === 'denied'}
                ariaLabel="Toggle notifications"
              />
            </div>

            {/* Permission Status badge */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-100 dark:bg-black/20">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  notificationPermission === 'granted'
                    ? 'bg-emerald-500'
                    : notificationPermission === 'denied'
                    ? 'bg-red-500'
                    : 'bg-yellow-500'
                }`}
              />
              <span className="text-sm text-slate-600 dark:text-slate-300">
                Permission:{' '}
                {notificationPermission === 'granted'
                  ? 'Granted'
                  : notificationPermission === 'denied'
                  ? 'Denied (Enable in browser settings)'
                  : notificationPermission === 'unsupported'
                  ? 'Not supported in this browser'
                  : 'Not requested'}
              </span>
            </div>

            {/* Notification Preferences (when enabled) */}
            {notificationSettings.enabled && (
              <div className="space-y-5 pt-1 border-t border-slate-200 dark:border-white/10">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest pt-1">
                  Notification Types
                </p>

                {/* Type toggles */}
                <div className="space-y-3">
                  {[
                    {
                      key: 'taskReminders' as const,
                      icon: <CheckSquare size={17} className="text-blue-500" />,
                      label: 'Task Reminders',
                    },
                    {
                      key: 'eventReminders' as const,
                      icon: <CalendarDays size={17} className="text-purple-500" />,
                      label: 'Event & Appointment Reminders',
                    },
                    {
                      key: 'budgetAlerts' as const,
                      icon: <AlertCircle size={17} className="text-amber-500" />,
                      label: 'Budget Alerts',
                    },
                  ].map(({ key, icon, label }) => (
                    <label
                      key={key}
                      className="flex items-center justify-between cursor-pointer px-4 py-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 hover:border-brand-500/30 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        {icon}
                        <span className="text-slate-800 dark:text-slate-100 font-medium text-sm">{label}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={notificationSettings[key]}
                        onChange={(e) => onNotificationPreferenceChange(key, e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                      />
                    </label>
                  ))}
                </div>

                {/* Lead Time Selector */}
                <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-white/10">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Remind me before event starts
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { value: 5, label: '5 min' },
                      { value: 15, label: '15 min' },
                      { value: 60, label: '1 hour' },
                      { value: 720, label: '12 hours' },
                      { value: 1440, label: '1 day' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => onNotificationPreferenceChange('reminderMinutesBefore', option.value)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          notificationSettings.reminderMinutesBefore === option.value
                            ? 'bg-brand-500 text-slate-900 shadow-md'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                    <button
                      onClick={() => onNotificationPreferenceChange('reminderMinutesBefore', -1)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        ![5, 15, 60, 720, 1440].includes(notificationSettings.reminderMinutesBefore)
                          ? 'bg-brand-500 text-slate-900 shadow-md'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      Custom
                    </button>
                  </div>

                  {/* Custom Input */}
                  {![5, 15, 60, 720, 1440].includes(notificationSettings.reminderMinutesBefore) && (
                    <div className="flex items-center gap-3 mt-2 animate-fade-in">
                      <input
                        type="number"
                        min="1"
                        max="999"
                        defaultValue={
                          notificationSettings.reminderMinutesBefore >= 1440
                            ? Math.floor(notificationSettings.reminderMinutesBefore / 1440)
                            : notificationSettings.reminderMinutesBefore >= 60
                            ? Math.floor(notificationSettings.reminderMinutesBefore / 60)
                            : notificationSettings.reminderMinutesBefore > 0
                            ? notificationSettings.reminderMinutesBefore
                            : 30
                        }
                        onChange={(e) => {
                          const num = parseInt(e.target.value) || 1;
                          const multiplier =
                            customReminderUnit === 'days' ? 1440 : customReminderUnit === 'hours' ? 60 : 1;
                          onNotificationPreferenceChange('reminderMinutesBefore', num * multiplier);
                        }}
                        className="w-20 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-center text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                      />
                      <Select
                        value={customReminderUnit}
                        onChange={(value) => {
                          const unit = value as 'minutes' | 'hours' | 'days';
                          setCustomReminderUnit(unit);
                          const currentTotal = notificationSettings.reminderMinutesBefore;
                          const currentMultiplier =
                            customReminderUnit === 'days' ? 1440 : customReminderUnit === 'hours' ? 60 : 1;
                          const currentNum = Math.floor(currentTotal / currentMultiplier) || 1;
                          const newMultiplier = unit === 'days' ? 1440 : unit === 'hours' ? 60 : 1;
                          onNotificationPreferenceChange('reminderMinutesBefore', currentNum * newMultiplier);
                        }}
                        options={[
                          { value: 'minutes', label: 'minutes' },
                          { value: 'hours', label: 'hours' },
                          { value: 'days', label: 'days' },
                        ]}
                        currentTheme={theme}
                        className="w-32"
                      />
                      <span className="text-sm text-slate-500 dark:text-slate-400">before</span>
                    </div>
                  )}
                </div>

                {/* Test Notification */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-white/10">
                  <p className="text-sm text-slate-500 dark:text-slate-400">Test your notification setup</p>
                  <Button
                    variant="secondary"
                    onClick={() => NotificationService.sendTestNotification()}
                    className="flex items-center gap-2"
                  >
                    <Bell size={15} />
                    Send Test
                  </Button>
                </div>

                {/* Default Notification Sound */}
                <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-white/10">
                  <div className="flex items-center gap-2">
                    <Volume2 size={16} className="text-slate-500 dark:text-slate-400" />
                    <label className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      Default Notification Sound
                    </label>
                    <span className="text-xs font-normal text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-full">
                      Android only
                    </span>
                  </div>
                  <Select
                    value={notificationSettings.defaultNotificationSound || 'sound_default'}
                    onChange={(value) =>
                      onNotificationPreferenceChange('defaultNotificationSound', value as NotificationSound)
                    }
                    options={[
                      { value: 'sound_default', label: '🔔 Default' },
                      { value: 'sound_chime', label: '🎵 Chime' },
                      { value: 'sound_beep', label: '📡 Digital Beep' },
                      { value: 'sound_synth', label: '🎹 Synth' },
                      { value: 'sound_alarm', label: '🚨 Loud Alarm' },
                      { value: 'sound_custom_os', label: '⚙️ Custom OS Alert' },
                    ]}
                    currentTheme={theme}
                    className="w-full"
                  />
                  {notificationSettings.defaultNotificationSound === 'sound_custom_os' && isNativePlatform() && (
                    <div className="space-y-2">
                      <Button
                        variant="secondary"
                        onClick={openNativeAppSettings}
                        className="w-full flex items-center justify-center gap-2"
                      >
                        <Settings size={14} />
                        Configure Custom Sound in OS Settings
                      </Button>
                      <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                        Tap this, select &apos;Notifications&apos;, tap &apos;Custom OS Alert&apos;, and choose your preferred sound.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* ── Integrations ── */}
        <div className="col-span-1 lg:col-span-2 space-y-4 pt-2">
          <SectionHeader icon={<Link2 size={22} />} label="Integrations" />
          <Card>
            {/* Google Calendar row */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 flex items-center justify-center shadow-sm shrink-0">
                  <span className="text-xl font-black text-blue-500">G</span>
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800 dark:text-slate-100">Google Calendar</h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                    Sync your Google Calendar events
                  </p>
                </div>
              </div>
              {onGoogleCalendarToggle && (
                <Toggle
                  checked={googleCalendarEnabled}
                  onChange={(v) => onGoogleCalendarToggle(v)}
                  color="blue"
                  ariaLabel="Toggle Google Calendar"
                />
              )}
            </div>

            {/* Connection Status */}
            {googleCalendarEnabled && (
              <div className="mt-5 pt-5 border-t border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-slate-100 dark:bg-black/20">
                  <div
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      hasGoogleToken ? 'bg-emerald-500' : 'bg-yellow-500'
                    }`}
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-300 flex-1">
                    {hasGoogleToken ? 'Connected to Google Calendar' : 'Re-authentication required'}
                  </span>
                  {!hasGoogleToken && (
                    <button
                      onClick={() => onGoogleCalendarToggle && onGoogleCalendarToggle(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                    >
                      <ExternalLink size={13} />
                      Connect
                    </button>
                  )}
                </div>
                {hasGoogleToken && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 px-1">
                    Events from your primary Google Calendar will appear in your calendar view.
                  </p>
                )}
              </div>
            )}
          </Card>
        </div>

        {/* ── Collaboration ── */}
        <div className="col-span-1 lg:col-span-2 pt-2">
          <CollaborationSettings
            currentUserId={session?.user?.id}
            currentUserEmail={session?.user?.email}
          />
        </div>

        {/* ── Advanced ── */}
        <div className="col-span-1 lg:col-span-2 space-y-4 pt-2">
          <SectionHeader icon={<Terminal size={22} />} label="Advanced" />
          <Card>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-800 dark:text-slate-200">Debug Logging</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  View internal application logs for troubleshooting
                </p>
              </div>
              <Button
                variant="secondary"
                onClick={() => onNavigate('debug-logs')}
                className="flex items-center gap-2 shrink-0"
              >
                <Terminal size={15} />
                View Logs
              </Button>
            </div>
          </Card>
        </div>

        {/* ── Danger Zone ── */}
        <div className="glass rounded-2xl p-6 lg:col-span-2 border-2 border-red-500/20">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center shrink-0">
              <AlertTriangle size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-red-600 dark:text-red-400">Danger Zone</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Irreversible actions</p>
            </div>
          </div>

          <div className="bg-red-50 dark:bg-red-500/10 rounded-xl p-4 border border-red-200 dark:border-red-500/20">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-semibold text-red-700 dark:text-red-400 mb-1">Delete Account</h4>
                <p className="text-sm text-red-600/80 dark:text-red-300/80">
                  Once deleted, all your data will be permanently erased. This action cannot be undone.
                </p>
              </div>
              <Button
                variant="danger"
                onClick={() => setIsDeleteAccountModalOpen(true)}
                className="flex items-center gap-2 shrink-0"
              >
                <Trash2 size={15} />
                Delete Account
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Account Modal */}
      <DeleteAccountModal
        isOpen={isDeleteAccountModalOpen}
        onClose={() => setIsDeleteAccountModalOpen(false)}
        onDeleted={() => onNavigate('/')}
        userEmail={session?.user?.email || ''}
      />
    </div>
  );
};

export default React.memo(SettingsPage);
