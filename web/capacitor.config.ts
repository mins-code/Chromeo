import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chronodex.app',
  appName: 'ChronoDeX',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // Allow loading local files and external resources
    allowNavigation: ['*.supabase.co', '*.googleapis.com'],
  },
  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_icon',
      iconColor: '#1e3a5f',
      sound: 'default',
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
  android: {
    // Include all necessary permissions
    includePlugins: ['@capacitor/local-notifications', '@capacitor/push-notifications'],
  },
};

export default config;
