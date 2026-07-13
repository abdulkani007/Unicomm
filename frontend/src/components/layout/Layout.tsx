import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useAccessibility } from '../../context/AccessibilityContext';
import { 
  Menu, X, Sun, Moon, Volume2, ZoomIn, 
  Activity, History, Settings, LogOut, Sparkles, User,
  ChevronLeft, ChevronRight, Mic, FileAudio, Camera, Languages, LayoutGrid
} from 'lucide-react';
import LightRays from '../effects/LightRays';
import TargetCursor from '../effects/TargetCursor';
import LineSidebar from './LineSidebar';
import DeafCommLogo from '../brand/DeafCommLogo';
import RotatingText from '../effects/RotatingText';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const { 
    theme, toggleTheme, 
    highContrast, toggleHighContrast, 
    largeText, toggleLargeText,
    t
  } = useAccessibility();
  
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const menuItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutGrid },
    { name: 'Speech to Text', path: '/speech-to-text', icon: Mic },
    { name: 'Audio File to Text', path: '/audio-to-text', icon: FileAudio },
    { name: 'Sign to Text', path: '/sign-to-text', icon: Camera },
    { name: 'Translation', path: '/translate', icon: Languages },
    { name: 'Text to Speech', path: '/text-to-speech', icon: Volume2 },
    { name: 'History Logs', path: '/history', icon: History },
    { name: 'Settings', path: '/settings', icon: Settings },
    { name: 'Profile', path: '/profile', icon: User },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  const currentActiveIndex = menuItems.findIndex(item => isActive(item.path));

  return (
    <div className="h-screen flex bg-slate-50 text-slate-900 dark:bg-[#070709] dark:text-slate-100 transition-colors duration-300 relative overflow-hidden">
      
      {/* SaaS WebGL Ambient Light Rays Backdrop */}
      <LightRays
        raysOrigin="top-center"
        raysColor="#ffffff"
        raysSpeed={0.8}
        lightSpread={0.8}
        rayLength={2.5}
        followMouse={true}
        mouseInfluence={0.12}
        noiseAmount={0.015}
        distortion={0.08}
        pulsating={true}
      />

      {/* Snap-to-Target Animated GSAP Cursor */}
      <TargetCursor 
        spinDuration={2}
        hideDefaultCursor={true}
        parallaxOn={true}
        hoverDuration={0.2}
        cursorColor="#ffffff"
        cursorColorOnTarget="#ffffff"
        targetSelector=".cursor-target"
      />
      
      {/* Desktop Navigation Sidebar */}
      <aside className="hidden md:flex flex-col border-r border-border/50 bg-card/60 glass-panel shrink-0 sticky top-0 h-screen w-68 z-20">
        {/* Brand logo */}
        <div className="p-5 border-b border-border/30 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-center shadow-lg shadow-black/40 shrink-0">
            <DeafCommLogo size={20} />
          </div>
          <span className="font-extrabold text-xl text-foreground flex items-center gap-1.5 shrink-0">
            <span>UniComm</span>
            <RotatingText
              texts={['AI', 'Sign', 'Voice', 'Sync', 'Link']}
              mainClassName="bg-primary text-primary-foreground px-2 py-0.5 rounded-lg text-xs font-black overflow-hidden"
              staggerFrom="last"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "-120%" }}
              staggerDuration={0.025}
              splitLevelClassName="overflow-hidden pb-0.5"
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
              rotationInterval={2200}
              splitBy="characters"
              auto
              loop
            />
          </span>
        </div>

        {/* LineSidebar Navigation Menu */}
        <div className="flex-grow px-3 py-6 overflow-x-hidden overflow-y-auto">
          <LineSidebar
            items={menuItems.map(item => {
              const Icon = item.icon;
              return {
                name: item.name,
                icon: <Icon />
              };
            })}
            activeIndex={currentActiveIndex >= 0 ? currentActiveIndex : 0}
            onItemClick={(index) => navigate(menuItems[index].path)}
            accentColor="var(--foreground)"
            textColor="var(--muted-foreground)"
            markerColor="var(--border)"
            showIndex={false}
            showMarker={true}
            proximityRadius={80}
            maxShift={20}
            falloff="smooth"
            markerLength={30}
            markerGap={8}
            tickScale={0.5}
            scaleTick={true}
            itemGap={16}
            fontSize={0.9}
            smoothing={100}
          />
        </div>

        {/* User Card & Logout / Sign In */}
        <div className="p-4 border-t border-border/30 bg-background/20 space-y-3">
          {user ? (
            <>
              <div className="flex items-center gap-3 px-2">
                <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
                  {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-bold truncate">{user.displayName || 'User'}</p>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
              </div>
              
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-input bg-card hover:bg-destructive hover:text-destructive-foreground hover:border-destructive text-sm font-semibold transition-all duration-200 cursor-pointer cursor-target"
              >
                <LogOut size={16} className="shrink-0" />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 px-2">
                <div className="h-10 w-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 font-bold shrink-0">
                  G
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-bold truncate">Guest Mode</p>
                  <p className="text-xs text-muted-foreground truncate">Limited features</p>
                </div>
              </div>
              
              <button
                onClick={() => navigate('/login')}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-100 text-zinc-950 font-bold hover:bg-zinc-200 text-sm transition-all duration-200 cursor-pointer cursor-target"
              >
                <span>Sign In</span>
              </button>
            </>
          )}
        </div>
      </aside>

      {/* Mobile Header & Main Page Panel */}
      <div className="flex-grow flex flex-col min-w-0 h-full overflow-hidden">
        <header className="md:hidden flex items-center justify-between p-4 border-b border-border/50 bg-card/60 glass-panel sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-zinc-950 border border-zinc-800/80 flex items-center justify-center shadow-md shadow-black/30 shrink-0">
              <DeafCommLogo size={16} />
            </div>
            <span className="font-bold text-lg text-foreground flex items-center gap-1 shrink-0">
              <span>UniComm</span>
              <RotatingText
                texts={['AI', 'Sign', 'Voice', 'Sync', 'Link']}
                mainClassName="bg-primary text-primary-foreground px-1.5 py-0.5 rounded text-[10px] font-black overflow-hidden"
                staggerFrom="last"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "-120%" }}
                staggerDuration={0.025}
                splitLevelClassName="overflow-hidden pb-0.5"
                transition={{ type: "spring", damping: 30, stiffness: 400 }}
                rotationInterval={2200}
                splitBy="characters"
                auto
                loop
              />
            </span>
          </div>

          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-lg border border-input bg-card text-foreground cursor-pointer cursor-target"
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
        </header>

        {/* Desktop Header panel (Accessibilities controls) */}
        <header className="hidden md:flex items-center justify-between p-6 border-b border-border/30 bg-card/10 glass-panel">
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground">{t('welcome_back')}</h2>
            <h1 className="text-2xl font-black text-foreground tracking-tight">{user?.displayName || 'User'}</h1>
          </div>

          {/* Quick Accessibilities Control Panel */}
          <div className="flex items-center gap-3">
            <div className="text-xs font-semibold text-muted-foreground mr-1">Accessibility Controls:</div>
            
            <button
              onClick={toggleLargeText}
              className={`p-2.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer cursor-target ${
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
              className={`p-2.5 rounded-xl border transition-all text-xs font-bold cursor-pointer cursor-target ${
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
              className="p-2.5 rounded-xl border border-input bg-card hover:bg-accent text-foreground transition-all cursor-pointer cursor-target"
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

              {user ? (
                <>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                      {user.displayName ? user.displayName[0].toUpperCase() : 'U'}
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold truncate">{user.displayName || 'User'}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-input bg-card hover:bg-destructive hover:text-destructive-foreground hover:border-destructive text-sm font-semibold transition-all cursor-pointer"
                  >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-zinc-900 flex items-center justify-center text-zinc-400 font-bold text-sm">
                      G
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-bold truncate">Guest Mode</p>
                      <p className="text-[10px] text-muted-foreground truncate">Limited features</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      navigate('/login');
                    }}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-zinc-100 text-zinc-950 font-bold hover:bg-zinc-200 text-sm transition-all cursor-pointer"
                  >
                    <span>Sign In</span>
                  </button>
                </>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

export default Layout;
