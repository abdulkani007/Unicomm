import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAccessibility } from '../context/AccessibilityContext';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Sparkles, Moon, Sun, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import LightRays from '../components/effects/LightRays';
import DeafCommLogo from '../components/brand/DeafCommLogo';
import RotatingText from '../components/effects/RotatingText';

const Register: React.FC = () => {
  const { register } = useAuth();
  const { theme, toggleTheme, highContrast, toggleHighContrast } = useAccessibility();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!email.trim()) {
      setError('Email address is required');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await register(email, password, name);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to create account.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-gradient-to-br from-indigo-50 via-slate-50 to-purple-50 dark:from-[#070709] dark:via-[#070709] dark:to-[#070709] relative overflow-hidden transition-colors duration-300">
      
      {/* SaaS WebGL Ambient Light Rays Backdrop */}
      <LightRays
        raysOrigin="top-center"
        raysColor="#ffffff"
        raysSpeed={0.6}
        lightSpread={0.8}
        rayLength={2.5}
        followMouse={true}
        mouseInfluence={0.15}
        noiseAmount={0.015}
        distortion={0.08}
        pulsating={true}
      />

      {/* Header controls */}
      <header className="p-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-center shadow-lg shadow-black/40">
            <DeafCommLogo size={20} />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-foreground flex items-center gap-1.5 shrink-0">
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

        <div className="flex gap-3">
          <button
            onClick={toggleHighContrast}
            className="p-2.5 rounded-xl border border-input bg-card hover:bg-accent hover:text-accent-foreground text-foreground text-sm font-medium transition-all"
            aria-label="Toggle High Contrast Mode"
          >
            {highContrast ? "Normal Contrast" : "High Contrast"}
          </button>
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl border border-input bg-card hover:bg-accent hover:text-accent-foreground text-foreground transition-all"
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
        </div>
      </header>

      {/* Main card */}
      <main className="flex-grow flex items-center justify-center p-4 z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-md glass-panel rounded-2xl p-8 shadow-2xl border border-border/50 bg-card/60"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Create Account</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Sign up to get started with UniComm AI
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-3"
            >
              <ShieldAlert size={18} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1" htmlFor="name">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                  <User size={18} />
                </div>
                <input
                  id="name"
                  type="text"
                  required
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background/50 focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-foreground"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                  <Mail size={18} />
                </div>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-4 py-2.5 rounded-xl border border-input bg-background/50 focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-foreground"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                  <Lock size={18} />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 rounded-xl border border-input bg-background/50 focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-foreground"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-foreground mb-1" htmlFor="confirm-password">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                  <Lock size={18} />
                </div>
                <input
                  id="confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 rounded-xl border border-input bg-background/50 focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-foreground"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <div className="h-5 w-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary hover:underline font-semibold">
              Sign In
            </Link>
          </p>
        </motion.div>
      </main>

      {/* Footer copyright */}
      <footer className="p-6 text-center text-xs text-muted-foreground z-10">
        &copy; {new Date().getFullYear()} UniComm AI. Designed for accessible and multimodal communication.
      </footer>
    </div>
  );
};

export default Register;
