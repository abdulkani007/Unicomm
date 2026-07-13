import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AccessibilityProvider } from './context/AccessibilityContext';
import Layout from './components/layout/Layout';
import Splash from './pages/Splash';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import SpeechToText from './pages/SpeechToText';
import AudioToText from './pages/AudioToText';
import SignToText from './pages/SignToText';
import Translation from './pages/Translation';
import TextToSpeech from './pages/TextToSpeech';
import History from './pages/History';
import Settings from './pages/Settings';
import Profile from './pages/Profile';

interface RouteGuardProps {
  children: React.ReactNode;
  requiresAuth?: boolean;
}

const RouteGuard: React.FC<RouteGuardProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#070709] text-white">
        <div className="h-10 w-10 border-4 border-zinc-100 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

const App: React.FC = () => {
  return (
    <AccessibilityProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Splash screen landing entry */}
            <Route path="/" element={<Splash />} />
            <Route path="/landing" element={<Landing />} />

            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* Universal access layouts (User or Guest) */}
            <Route
              path="/dashboard"
              element={
                <RouteGuard>
                  <Dashboard />
                </RouteGuard>
              }
            />
            <Route
              path="/speech-to-text"
              element={
                <RouteGuard>
                  <SpeechToText />
                </RouteGuard>
              }
            />
            <Route
              path="/audio-to-text"
              element={
                <RouteGuard>
                  <AudioToText />
                </RouteGuard>
              }
            />
            <Route
              path="/sign-to-text"
              element={
                <RouteGuard>
                  <SignToText />
                </RouteGuard>
              }
            />
            <Route
              path="/translate"
              element={
                <RouteGuard>
                  <Translation />
                </RouteGuard>
              }
            />
            <Route
              path="/text-to-speech"
              element={
                <RouteGuard>
                  <TextToSpeech />
                </RouteGuard>
              }
            />

            {/* Authentication strictly required routes */}
            <Route
              path="/history"
              element={
                <RouteGuard requiresAuth={true}>
                  <History />
                </RouteGuard>
              }
            />
            <Route
              path="/settings"
              element={
                <RouteGuard requiresAuth={true}>
                  <Settings />
                </RouteGuard>
              }
            />
            <Route
              path="/profile"
              element={
                <RouteGuard requiresAuth={true}>
                  <Profile />
                </RouteGuard>
              }
            />

            {/* Catch-all redirect to Splash screen */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </AccessibilityProvider>
  );
};

export default App;
