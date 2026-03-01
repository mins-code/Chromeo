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

  return (
    <div className="space-y-8 animate-fade-in h-full flex flex-col">
      <header className="border-b border-slate-200 dark:border-white/5 pb-6">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-2">Settings</h2>
        <p className="text-slate-500 dark:text-slate-400">Manage your preferences, account, and team.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-y-auto pb-20">
        {/* Profile Settings */}
        <div className="col-span-1 lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-slate-200">
            <User className="text-brand-500" />
            <h3>Profile</h3>
          </div>
          <div className="glass-panel p-6 rounded-2xl">
            <Input
              label="Display Name / Nickname"
              value={username}
              onChange={(e) => onUsernameChange(e.target.value)}
              placeholder="How should we call you?"
            />
            <div className="mt-4">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-2 ml-1 font-mono">
                Account
              </label>
              <p className="text-slate-700 dark:text-slate-300 text-sm mb-4">
                Logged in as {session?.user?.email}
              </p>
              <Button
                variant="secondary"
                onClick={onSignOut}
                className="w-auto border-red-500/20 text-red-500 hover:bg-red-500/10"
              >
                <LogOut size={16} className="mr-2" /> Sign Out
              </Button>
            </div>
          </div>
        </div>

        {/* Appearance Settings */}
        <div className="col-span-1 lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-slate-200">
            <Palette className="text-brand-500" />
            <h3>Appearance</h3>
          </div>
          <div className="glass-panel p-6 rounded-2xl">
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
          </div>
        </div>

        {/* Notifications Section */}
        <div className="col-span-1 lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-slate-200">
            <Bell className="text-brand-500" />
            <h3>Notifications</h3>
          </div>
          <div className="glass-panel p-6 rounded-2xl space-y-6">
            {/* Main Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                  Enable Notifications
                </h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Get notified about tasks, events, and budget alerts
                </p>
              </div>
              <button
                type="button"
                onClick={() => notificationPermission !== 'denied' && onNotificationToggle(!notificationSettings.enabled)}
                disabled={notificationPermission === 'denied'}
                className={`relative w-14 h-7 rounded-full transition-colors duration-200 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
                  notificationSettings.enabled ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-600'
                } ${notificationPermission === 'denied' ? 'opacity-50 cursor-not-allowed' : ''}`}
                role="switch"
                aria-checked={notificationSettings.enabled}
              >
                <span className="sr-only">Toggle notifications</span>
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute top-1 left-1 w-5 h-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out ${
                    notificationSettings.enabled ? 'translate-x-7' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Permission Status */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-black/5 dark:bg-black/20">
              <div
                className={`w-2 h-2 rounded-full ${
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

            {/* Notification Preferences */}
            {notificationSettings.enabled && (
              <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-white/10">
                <h5 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">
                  Notification Types
                </h5>

                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <CheckSquare size={18} className="text-blue-500" />
                    <span className="text-slate-800 dark:text-slate-100 font-medium">Task Reminders</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNotificationPreferenceChange('taskReminders', !notificationSettings.taskReminders)}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
                      notificationSettings.taskReminders ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                    role="switch"
                    aria-checked={notificationSettings.taskReminders}
                  >
                    <span className="sr-only">Toggle task reminders</span>
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute top-1 left-1 w-4 h-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${
                        notificationSettings.taskReminders ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <CalendarDays size={18} className="text-purple-500" />
                    <span className="text-slate-800 dark:text-slate-100 font-medium">
                      Event &amp; Appointment Reminders
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNotificationPreferenceChange('eventReminders', !notificationSettings.eventReminders)}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
                      notificationSettings.eventReminders ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                    role="switch"
                    aria-checked={notificationSettings.eventReminders}
                  >
                    <span className="sr-only">Toggle event reminders</span>
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute top-1 left-1 w-4 h-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${
                        notificationSettings.eventReminders ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <AlertCircle size={18} className="text-amber-500" />
                    <span className="text-slate-800 dark:text-slate-100 font-medium">Budget Alerts</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNotificationPreferenceChange('budgetAlerts', !notificationSettings.budgetAlerts)}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
                      notificationSettings.budgetAlerts ? 'bg-brand-500' : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                    role="switch"
                    aria-checked={notificationSettings.budgetAlerts}
                  >
                    <span className="sr-only">Toggle budget alerts</span>
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none absolute top-1 left-1 w-4 h-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out ${
                        notificationSettings.budgetAlerts ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Lead Time Selector */}
                <div className="pt-4 border-t border-slate-200 dark:border-white/10 space-y-3">
                  <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Remind me before event starts
                  </label>
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
                            ? 'bg-brand-500 text-slate-900 shadow-md scale-105'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:shadow-sm'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                    <button
                      onClick={() => onNotificationPreferenceChange('reminderMinutesBefore', -1)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        ![5, 15, 60, 720, 1440].includes(notificationSettings.reminderMinutesBefore)
                          ? 'bg-brand-500 text-slate-900 shadow-md scale-105'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 hover:shadow-sm'
                      }`}
                    >
                      Custom
                    </button>
                  </div>

                  {/* Custom Input */}
                  {![5, 15, 60, 720, 1440].includes(notificationSettings.reminderMinutesBefore) && (
                    <div className="flex items-center gap-3 mt-3 animate-fade-in">
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

                {/* Test Notification Button */}
                <div className="pt-4">
                  <Button
                    variant="secondary"
                    onClick={() => NotificationService.sendTestNotification()}
                    className="flex items-center gap-2"
                  >
                    <Bell size={16} />
                    Send Test Notification
                  </Button>
                </div>

                {/* Default Notification Sound */}
                <div className="pt-4 border-t border-slate-200 dark:border-white/10 space-y-3">
                  <label className="block text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Default Notification Sound
                    <span className="ml-2 text-xs font-normal text-slate-400 dark:text-slate-400">
                      Android only
                    </span>
                  </label>
                  <Select
                    value={notificationSettings.defaultNotificationSound || 'sound_default'}
                    onChange={(value) =>
                      onNotificationPreferenceChange(
                        'defaultNotificationSound',
                        value as NotificationSound
                      )
                    }
                    options={[
                      { value: 'sound_default',   label: '🔔 Default' },
                      { value: 'sound_chime',     label: '🎵 Chime' },
                      { value: 'sound_beep',      label: '📡 Digital Beep' },
                      { value: 'sound_synth',     label: '🎹 Synth' },
                      { value: 'sound_alarm',     label: '🚨 Loud Alarm' },
                      { value: 'sound_custom_os', label: '⚙️ Custom OS Alert' },
                    ]}
                    currentTheme={theme}
                    className="w-full"
                  />
                  {(notificationSettings.defaultNotificationSound === 'sound_custom_os') && isNativePlatform() && (
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
          </div>
        </div>

        {/* Integrations Section */}
        <div className="col-span-1 lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-slate-200">
            <Link2 className="text-brand-500" />
            <h3>Integrations</h3>
          </div>
          <div className="glass-panel p-6 rounded-2xl">
            {/* Google Calendar Integration */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 flex items-center justify-center shadow-sm">
                  <span className="text-2xl font-bold text-blue-500">G</span>
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                    Google Calendar
                  </h4>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Sync your Google Calendar events
                  </p>
                </div>
              </div>
              {onGoogleCalendarToggle && (
                <button
                  type="button"
                  onClick={() => onGoogleCalendarToggle(!googleCalendarEnabled)}
                  className={`relative w-14 h-7 rounded-full transition-colors duration-200 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                    googleCalendarEnabled ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'
                  }`}
                  role="switch"
                  aria-checked={googleCalendarEnabled}
                >
                  <span className="sr-only">Toggle Google Calendar</span>
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute top-1 left-1 w-5 h-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ease-in-out ${
                      googleCalendarEnabled ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </button>
              )}
            </div>

            {/* Connection Status */}
            {googleCalendarEnabled && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-black/5 dark:bg-black/20">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      hasGoogleToken ? 'bg-emerald-500' : 'bg-yellow-500'
                    }`}
                  />
                  <span className="text-sm text-slate-600 dark:text-slate-300 flex-1">
                    {hasGoogleToken
                      ? 'Connected to Google Calendar'
                      : 'Re-authentication required'}
                  </span>
                  {!hasGoogleToken && (
                    <button
                      onClick={() => onGoogleCalendarToggle && onGoogleCalendarToggle(true)}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                    >
                      <ExternalLink size={14} />
                      Connect
                    </button>
                  )}
                </div>
                {hasGoogleToken && (
                  <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    Events from your primary Google Calendar will appear in your calendar view.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Collaboration Section */}
        <div className="col-span-1 lg:col-span-2">
          <CollaborationSettings
            currentUserId={session?.user?.id}
            currentUserEmail={session?.user?.email}
          />
        </div>

        {/* Advanced Section */}
        <div className="col-span-1 lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 text-xl font-bold text-slate-800 dark:text-slate-200">
             <Terminal className="text-brand-500" />
            <h3>Advanced</h3>
          </div>
          <div className="glass-panel p-6 rounded-2xl">
            <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Diagnostics</h4>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-800 dark:text-slate-200 font-medium">Debug Logging</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">View internal application logs for troubleshooting</p>
              </div>
              <Button 
                variant="secondary"
                onClick={() => onNavigate('debug-logs')}
                className="flex items-center gap-2"
              >
                <Terminal size={16} />
                View Logs
              </Button>
            </div>
          </div>
        </div>

        {/* Danger Zone - Account Deletion */}
        <div className="glass rounded-2xl p-6 lg:col-span-2 border-2 border-red-500/20">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center">
              <AlertTriangle size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-red-600 dark:text-red-400">Danger Zone</h3>
              <p className="text-sm text-slate-500">Irreversible actions</p>
            </div>
          </div>

          <div className="bg-red-50 dark:bg-red-500/10 rounded-xl p-4 border border-red-200 dark:border-red-500/20">
            <h4 className="font-semibold text-red-700 dark:text-red-400 mb-2">Delete Account</h4>
            <p className="text-sm text-red-600/80 dark:text-red-300/80 mb-4">
              Once you delete your account, all your data will be permanently erased. This action cannot be
              undone.
            </p>
            <Button
              variant="danger"
              onClick={() => setIsDeleteAccountModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Trash2 size={16} />
              Delete Account
            </Button>
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