import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAccessibility } from '../context/AccessibilityContext';
import { motion } from 'framer-motion';
import { Mail, Lock, Sparkles, Moon, Sun, ShieldAlert, Eye, EyeOff } from 'lucide-react';
import LightRays from '../components/effects/LightRays';
import DeafCommLogo from '../components/brand/DeafCommLogo';
import RotatingText from '../components/effects/RotatingText';

const Login: React.FC = () => {
  const { login, loginWithGoogle } = useAuth();
  const { theme, toggleTheme, highContrast, toggleHighContrast } = useAccessibility();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Please fill in all fields');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await login(email, password, rememberMe);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setIsLoading(true);
    try {
      await loginWithGoogle(rememberMe);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
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
            <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Welcome Back</h1>
            <p className="text-sm text-muted-foreground mt-2">
              Sign in to access your communication assistant
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

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-foreground mb-1.5" htmlFor="email">
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
                  className="block w-full pl-10 pr-4 py-3 rounded-xl border border-input bg-background/50 focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-foreground"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-semibold text-foreground" htmlFor="password">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-primary hover:underline font-medium"
                >
                  Forgot Password?
                </Link>
              </div>
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
                  className="block w-full pl-10 pr-10 py-3 rounded-xl border border-input bg-background/50 focus:bg-background focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-foreground"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pb-2">
              <label className="flex items-center gap-2 cursor-pointer select-none cursor-target">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-primary/20 bg-background/50 cursor-pointer"
                />
                <span className="text-xs text-muted-foreground font-medium">Remember Me</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-primary hover:bg-primary/95 text-primary-foreground font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="h-5 w-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card/90 px-3 text-muted-foreground font-medium">Or continue with</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full py-3 rounded-xl border border-input bg-card hover:bg-accent text-foreground font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <svg className="h-5 w-5 mr-1" viewBox="0 0 24 24" width="24" height="24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </button>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary hover:underline font-semibold">
              Create an account
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

export default Login;
