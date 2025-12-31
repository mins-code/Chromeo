import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';

interface UserSettings {
  displayName: string;
}

/**
 * Hook to manage user settings (display name, preferences) with Supabase sync.
 * Centralizes username management that was previously scattered in App.tsx.
 */
export function useUserSettings() {
  const { session } = useAuth();
  const [displayName, setDisplayName] = useState('User');
  const [isLoading, setIsLoading] = useState(true);

  // Load user settings on mount/session change
  useEffect(() => {
    const loadSettings = async () => {
      if (!session?.user) {
        setDisplayName('User');
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('display_name')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (error) {
          console.error('Error loading user settings:', error);
        } else if (data?.display_name) {
          setDisplayName(data.display_name);
        }
      } catch (err) {
        console.error('Failed to load user settings:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [session?.user?.id]);

  // Update display name
  const updateDisplayName = useCallback(async (newName: string) => {
    setDisplayName(newName);

    if (!session?.user) return;

    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: session.user.id,
          display_name: newName
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error updating display name:', error);
      }
    } catch (err) {
      console.error('Failed to update display name:', err);
    }
  }, [session?.user?.id]);

  return {
    displayName,
    updateDisplayName,
    isLoading,
  };
}
