import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { 
  Menu, X, Sun, Moon, Volume2, ZoomIn, 
  Activity, MessageSquare, History, Settings, LogOut, Sparkles, User
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const { 
    theme, toggleTheme, 
    highContrast, toggleHighContrast, 
    largeText, toggleLargeText 
  } = useAccessibility();
  
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: Activity },
    { name: 'Real-Time Translate', path: '/translate', icon: MessageSquare },
    { name: 'History Logs', path: '/history', icon: History },
    { name: 'Settings', path: '/settings', icon: Settings },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-300">
      
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-border/50 bg-card/60 glass-panel shrink-0 sticky top-0 h-screen z-20">
        {/* Brand logo */}
        <div className="p-6 border-b border-border/30 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-white font-extrabold text-xl">U</span>
          </div>
          <span className="font-extrabold text-xl bg-gradient-to-r from-primary to-purple-600 dark:to-purple-400 bg-clip-text text-transparent">
            UniComm AI
          </span>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-grow p-4 space-y-1.5 mt-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                  active 
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25' 
                    : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                }`}
              >
                <Icon size={18} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-border/30 bg-background/20 space-y-3">
          <div className="flex items-center gap-3 px-2">
            <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold">
              {user?.displayName ? user.displayName[0].toUpperCase() : 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate">{user?.displayName || 'User'}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          </div>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-input bg-card hover:bg-destructive hover:text-destructive-foreground hover:border-destructive text-sm font-semibold transition-all duration-200 cursor-pointer"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="flex-grow flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border/50 bg-card/60 glass-panel sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-extrabold text-sm">U</span>
            </div>
            <span className="font-bold text-lg bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              UniComm AI
            </span>
          </div>

          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-lg border border-input bg-card text-foreground"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
        </header>

        {/* Desktop Header panel (Accessibilities controls) */}
        <header className="hidden md:flex items-center justify-between p-6 border-b border-border/30 bg-card/10 glass-panel">
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground">Welcome back,</h2>
            <h1 className="text-2xl font-black text-foreground tracking-tight">{user?.displayName || 'User'}</h1>
          </div>

          {/* Quick Accessibilities Control Panel */}
          <div className="flex items-center gap-3">
            <div className="text-xs font-semibold text-muted-foreground mr-1">Accessibility Controls:</div>
            
            <button
              onClick={toggleLargeText}
              className={`p-2.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer ${
                largeText 
                  ? 'bg-primary border-primary text-primary-foreground' 
                  : 'border-input bg-card hover:bg-accent text-foreground'
              }`}
              title="Toggle Large Text"
            >
              <ZoomIn size={14} />
              <span>A+</span>
            </button>

            <button
              onClick={toggleHighContrast}
              className={`p-2.5 rounded-xl border transition-all text-xs font-bold cursor-pointer ${
                highContrast 
                  ? 'bg-primary border-primary text-primary-foreground' 
                  : 'border-input bg-card hover:bg-accent text-foreground'
              }`}
              title="Toggle High Contrast Mode"
            >
              Contrast
            </button>

            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border border-input bg-card hover:bg-accent text-foreground transition-all cursor-pointer"
              title="Toggle Light/Dark Theme"
            >
              {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
            </button>
          </div>
        </header>

        {/* Page Content area */}
        <main className="flex-grow p-4 md:p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Drawer Slide-out */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          
          <aside className="relative flex flex-col w-80 max-w-[80vw] bg-card h-full p-6 shadow-2xl border-r border-border/50">
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 rounded-lg border border-input text-foreground"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-2 mb-8 mt-2">
              <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-white font-bold">U</span>
              </div>
              <span className="font-extrabold text-lg text-foreground">UniComm AI</span>
            </div>

            <nav className="flex-grow space-y-1.5">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-semibold transition-all ${
                      active 
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25' 
                        : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="border-t border-border/50 pt-6 space-y-4">
              {/* Accessibility toggles inside mobile drawer */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground">Accessibility</div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={toggleTheme}
                    className="py-2.5 rounded-lg border border-input flex justify-center text-foreground hover:bg-secondary"
                  >
                    {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
                  </button>
                  <button
                    onClick={toggleHighContrast}
                    className={`py-2 text-xs font-bold rounded-lg border ${highContrast ? 'bg-primary text-white border-primary' : 'border-input text-foreground hover:bg-secondary'}`}
                  >
                    Contrast
                  </button>
                  <button
                    onClick={toggleLargeText}
                    className={`py-2 text-xs font-bold rounded-lg border ${largeText ? 'bg-primary text-white border-primary' : 'border-input text-foreground hover:bg-secondary'}`}
                  >
                    A+
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                  {user?.displayName ? user.displayName[0].toUpperCase() : 'U'}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold truncate">{user?.displayName || 'User'}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{user?.email}</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-input bg-card hover:bg-destructive hover:text-destructive-foreground hover:border-destructive text-sm font-semibold transition-all cursor-pointer"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

export default Layout;
