import React, { createContext, useContext, useState, useEffect, PropsWithChildren, useCallback } from 'react';
import { ThemeOption } from '../types';
import { supabase } from '../services/supabaseClient';
import { useAuth } from './AuthContext';

interface ThemeContextType {
  theme: ThemeOption;
  setTheme: (theme: ThemeOption, saveToDb?: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const { session } = useAuth();
  const [theme, setThemeState] = useState<ThemeOption>('light');

  // Load theme from DB or localStorage on mount
  useEffect(() => {
    const loadTheme = async () => {
      if (session?.user) {
        const { data } = await supabase
          .from('user_settings')
          .select('theme')
          .eq('user_id', session.user.id)
          .single();
        
        if (data?.theme) {
          applyThemeToDOM(data.theme as ThemeOption);
          setThemeState(data.theme as ThemeOption);
          return;
        }
      }
      
      // Fallback to localStorage
      const savedTheme = localStorage.getItem('chronodex_theme') as ThemeOption | null;
      if (savedTheme) {
        applyThemeToDOM(savedTheme);
        setThemeState(savedTheme);
      }
    };

    loadTheme();
  }, [session]);

  const applyThemeToDOM = (newTheme: ThemeOption) => {
    document.documentElement.classList.remove('dark', 'theme-cyberpunk', 'theme-sunset', 'theme-onepiece');

    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else if (newTheme !== 'light') {
      document.documentElement.classList.add('dark', `theme-${newTheme}`);
    }

    // Update favicon based on theme
    const favicon = document.getElementById('app-favicon') as HTMLLinkElement;
    if (favicon) {
      favicon.href = `/favicon-${newTheme}.png`;
    }
  };

  const setTheme = useCallback((newTheme: ThemeOption, saveToDb = true) => {
    setThemeState(newTheme);
    localStorage.setItem('chronodex_theme', newTheme);
    applyThemeToDOM(newTheme);

    if (saveToDb && session?.user) {
      supabase.from('user_settings').upsert({ user_id: session.user.id, theme: newTheme }).then();
    }
  }, [session]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
