import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { useAccessibility } from '../context/AccessibilityContext';
import { 
  Languages, Moon, Sun, ZoomIn, Eye, Volume2, Video, 
  Check, Save, Sparkles, AlertCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

interface UserSettings {
  userId: string;
  interfaceLanguage: string;
  speechSpeed: number;
  theme: string;
  highContrast: boolean;
  largeText: boolean;
  cameraResolution: string;
}

const Settings: React.FC = () => {
  const queryClient = useQueryClient();
  const acc = useAccessibility();

  // Fetch settings from API
  const { data: serverSettings, isLoading } = useQuery<UserSettings>({
    queryKey: ['userSettings'],
    queryFn: async () => {
      const response = await api.get('/settings');
      return response.data;
    },
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Mutate settings
  const settingsMutation = useMutation({
    mutationFn: async (updated: Partial<UserSettings>) => {
      const response = await api.put('/settings', updated);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['userSettings'], data);
      
      // Update local AccessibilityContext state
      if (data.theme !== undefined) {
        if (data.theme !== acc.theme) acc.toggleTheme();
      }
      if (data.highContrast !== undefined && data.highContrast !== acc.highContrast) {
        acc.toggleHighContrast();
      }
      if (data.largeText !== undefined && data.largeText !== acc.largeText) {
        acc.toggleLargeText();
      }
      if (data.speechSpeed !== undefined) {
        acc.setSpeechSpeed(data.speechSpeed);
      }
      if (data.interfaceLanguage !== undefined) {
        acc.setLanguage(data.interfaceLanguage);
      }
      
      alert("Settings saved successfully.");
    },
    onError: (err) => {
      console.error("Failed to save settings on server:", err);
      // If server fails (e.g. offline), we still apply changes locally!
      alert("Settings applied locally.");
    }
  });

  // Fallback to local settings context if API is loading or unavailable
  const currentSettings: UserSettings = serverSettings || {
    userId: 'local',
    interfaceLanguage: acc.language,
    speechSpeed: acc.speechSpeed,
    theme: acc.theme,
    highContrast: acc.highContrast,
    largeText: acc.largeText,
    cameraResolution: localStorage.getItem('cameraResolution') || '720p',
  };

  const handleSave = (field: keyof UserSettings, value: any) => {
    // If running offline or mock, we sync locally first
    if (field === 'interfaceLanguage') {
      acc.setLanguage(value);
    }
    if (field === 'cameraResolution') {
      localStorage.setItem('cameraResolution', value);
    }
    
    // Save to server
    settingsMutation.mutate({ [field]: value });
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">System Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Customize UI aesthetics, accessibility parameters, and machine learning modules.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: Language & Theme */}
        <div className="bg-card/40 border border-border/50 rounded-xl p-6 glass-panel space-y-6 shadow-sm">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2 border-b border-border/20 pb-3">
            <Languages size={18} className="text-primary" />
            <span>Display & Language</span>
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Interface Language
              </label>
              <select
                value={currentSettings.interfaceLanguage}
                onChange={(e) => handleSave('interfaceLanguage', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-input bg-background/50 text-foreground font-semibold outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="en">English (US)</option>
                <option value="hi">हिन्दी (Hindi)</option>
                <option value="ta">தமிழ் (Tamil)</option>
                <option value="ml">മലയാളം (Malayalam)</option>
                <option value="te">తెలుగు (Telugu)</option>
                <option value="kn">ಕನ್ನಡ (Kannada)</option>
                <option value="ar">العربية (Arabic)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Color Theme
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleSave('theme', 'light')}
                  className={`py-4 rounded-xl border flex flex-col items-center gap-2 font-bold cursor-pointer transition-all ${
                    currentSettings.theme === 'light' 
                      ? 'border-primary bg-primary/10 text-primary' 
                      : 'border-input bg-background/30 hover:bg-accent text-foreground'
                  }`}
                >
                  <Sun size={20} />
                  <span>Light</span>
                </button>
                <button
                  onClick={() => handleSave('theme', 'dark')}
                  className={`py-4 rounded-xl border flex flex-col items-center gap-2 font-bold cursor-pointer transition-all ${
                    currentSettings.theme === 'dark' 
                      ? 'border-primary bg-primary/10 text-primary' 
                      : 'border-input bg-background/30 hover:bg-accent text-foreground'
                  }`}
                >
                  <Moon size={20} />
                  <span>Dark</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Accessibility */}
        <div className="bg-card/40 border border-border/50 rounded-xl p-6 glass-panel space-y-6 shadow-sm">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2 border-b border-border/20 pb-3">
            <ZoomIn size={18} className="text-primary" />
            <span>Accessibility Engine</span>
          </h2>

          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">High Contrast</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Increases text color contrast for better legibility</p>
              </div>
              <button
                onClick={() => handleSave('highContrast', !currentSettings.highContrast)}
                className={`w-14 h-8 rounded-full transition-all duration-300 relative ${
                  currentSettings.highContrast ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'
                }`}
                aria-label="Toggle High Contrast"
              >
                <div className={`w-6 h-6 rounded-full bg-white absolute top-1 transition-all duration-300 shadow-sm ${
                  currentSettings.highContrast ? 'left-7' : 'left-1'
                }`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-foreground">Large Font Mode</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Increases text size across the entire application interface</p>
              </div>
              <button
                onClick={() => handleSave('largeText', !currentSettings.largeText)}
                className={`w-14 h-8 rounded-full transition-all duration-300 relative ${
                  currentSettings.largeText ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'
                }`}
                aria-label="Toggle Large Font Mode"
              >
                <div className={`w-6 h-6 rounded-full bg-white absolute top-1 transition-all duration-300 shadow-sm ${
                  currentSettings.largeText ? 'left-7' : 'left-1'
                }`} />
              </button>
            </div>
          </div>
        </div>

        {/* Card 3: Camera Resolution */}
        <div className="bg-card/40 border border-border/50 rounded-xl p-6 glass-panel space-y-6 shadow-sm">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2 border-b border-border/20 pb-3">
            <Video size={18} className="text-primary" />
            <span>Camera & Sign recognition</span>
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                Video Resolution
              </label>
              <select
                value={currentSettings.cameraResolution}
                onChange={(e) => handleSave('cameraResolution', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-input bg-background/50 text-foreground font-semibold outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="360p">360p (Low Bandwidth)</option>
                <option value="480p">480p (Standard)</option>
                <option value="720p">720p (High Definition - Recommended)</option>
                <option value="1080p">1080p (Full HD - High CPU)</option>
              </select>
            </div>
            <p className="text-xs text-muted-foreground flex items-start gap-1.5 bg-background/20 p-3 rounded-lg border border-border/30">
              <AlertCircle size={15} className="mt-0.5 shrink-0 text-amber-500" />
              <span>Higher resolutions improve hand sign detection accuracy, but demand higher processing power. Use 720p for a balanced experience.</span>
            </p>
          </div>
        </div>

        {/* Card 4: Speech Speed control */}
        <div className="bg-card/40 border border-border/50 rounded-xl p-6 glass-panel space-y-6 shadow-sm">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2 border-b border-border/20 pb-3">
            <Volume2 size={18} className="text-primary" />
            <span>Voice & Text to Speech</span>
          </h2>

          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  Voice Speech Speed
                </label>
                <span className="text-xs font-bold text-primary">{currentSettings.speechSpeed}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={currentSettings.speechSpeed}
                onChange={(e) => handleSave('speechSpeed', parseFloat(e.target.value))}
                className="w-full accent-primary h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Adjusts the speech synthesis output rate when speaking sign predicted values or text. Set lower for clearer articulation.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Settings;
