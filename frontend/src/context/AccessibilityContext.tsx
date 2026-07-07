import React, { createContext, useContext, useState, useEffect } from 'react';

interface AccessibilityContextType {
  theme: 'light' | 'dark';
  highContrast: boolean;
  largeText: boolean;
  speechSpeed: number;
  toggleTheme: () => void;
  toggleHighContrast: () => void;
  toggleLargeText: () => void;
  setSpeechSpeed: (speed: number) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
  });
  const [highContrast, setHighContrast] = useState<boolean>(() => {
    return localStorage.getItem('highContrast') === 'true';
  });
  const [largeText, setLargeText] = useState<boolean>(() => {
    return localStorage.getItem('largeText') === 'true';
  });
  const [speechSpeed, setSpeechSpeedState] = useState<number>(() => {
    const saved = localStorage.getItem('speechSpeed');
    return saved ? parseFloat(saved) : 1.0;
  });

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Apply dark mode
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (highContrast) {
      root.classList.add('high-contrast');
    } else {
      root.classList.remove('high-contrast');
    }
    localStorage.setItem('highContrast', String(highContrast));
  }, [highContrast]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (largeText) {
      root.classList.add('large-text');
    } else {
      root.classList.remove('large-text');
    }
    localStorage.setItem('largeText', String(largeText));
  }, [largeText]);

  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  const toggleHighContrast = () => setHighContrast(prev => !prev);
  const toggleLargeText = () => setLargeText(prev => !prev);
  
  const setSpeechSpeed = (speed: number) => {
    const clamped = Math.max(0.5, Math.min(2.0, speed));
    setSpeechSpeedState(clamped);
    localStorage.setItem('speechSpeed', String(clamped));
  };

  return (
    <AccessibilityContext.Provider
      value={{
        theme,
        highContrast,
        largeText,
        speechSpeed,
        toggleTheme,
        toggleHighContrast,
        toggleLargeText,
        setSpeechSpeed,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
};
