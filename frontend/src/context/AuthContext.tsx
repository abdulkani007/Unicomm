import React, { createContext, useContext, useState, useEffect } from 'react';
import { initializeApp, getApps } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail, 
  signInWithPopup, 
  GoogleAuthProvider,
  onAuthStateChanged
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';

interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: 'user' | 'admin';
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  isMockMode: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Firebase configuration using environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

let auth: any = null;
let isMockMode = true;

try {
  // If API key is provided, try initializing Firebase
  if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_FIREBASE_API_KEY") {
    if (getApps().length === 0) {
      initializeApp(firebaseConfig);
    }
    auth = getAuth();
    isMockMode = false;
    console.log("Firebase Auth initialized successfully.");
  } else {
    console.warn("No VITE_FIREBASE_API_KEY configured. Running in MOCK AUTH MODE.");
  }
} catch (error) {
  console.warn("Failed to initialize Firebase Auth:", error, "Falling back to MOCK AUTH MODE.");
  isMockMode = true;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Synchronize authentication status
  useEffect(() => {
    if (isMockMode || !auth) {
      // Mock auth initial state load
      const savedUser = localStorage.getItem('mock_user');
      const savedToken = localStorage.getItem('mock_token');
      if (savedUser && savedToken) {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      }
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        const idToken = await firebaseUser.getIdToken();
        setToken(idToken);
        
        // Save token to localStorage for API calls
        localStorage.setItem('fb_token', idToken);
        localStorage.removeItem('mock_token');
        
        // Setup user profile
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          role: firebaseUser.email?.endsWith('@unicomm.ai') ? 'admin' : 'user'
        });
      } else {
        setUser(null);
        setToken(null);
        localStorage.removeItem('fb_token');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      if (isMockMode || !auth) {
        // Mock implementation
        await new Promise((resolve) => setTimeout(resolve, 800)); // simulate network delay
        if (password.length < 6) throw new Error("Password must be at least 6 characters.");
        
        const mockUid = "usr_" + email.split('@')[0];
        const mockUser: UserProfile = {
          uid: mockUid,
          email: email,
          displayName: email.split('@')[0].toUpperCase(),
          role: email.startsWith("admin") ? 'admin' : 'user'
        };
        const mockToken = mockUid === "usr_admin" ? "mock-token-admin" : `mock-token-${mockUid}`;
        
        setUser(mockUser);
        setToken(mockToken);
        localStorage.setItem('mock_user', JSON.stringify(mockUser));
        localStorage.setItem('mock_token', mockToken);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    setLoading(true);
    try {
      if (isMockMode || !auth) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        if (password.length < 6) throw new Error("Password must be at least 6 characters.");
        
        const mockUid = "usr_" + email.split('@')[0];
        const mockUser: UserProfile = {
          uid: mockUid,
          email: email,
          displayName: name,
          role: 'user'
        };
        const mockToken = `mock-token-${mockUid}`;
        
        setUser(mockUser);
        setToken(mockToken);
        localStorage.setItem('mock_user', JSON.stringify(mockUser));
        localStorage.setItem('mock_token', mockToken);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        // Note: we could also update displayName here but keeping it simple
      }
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      if (isMockMode || !auth) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        const mockUser: UserProfile = {
          uid: "usr_google_mock",
          email: "google.user@gmail.com",
          displayName: "Google Mock User",
          role: 'user'
        };
        const mockToken = "mock-token-usr_google_mock";
        setUser(mockUser);
        setToken(mockToken);
        localStorage.setItem('mock_user', JSON.stringify(mockUser));
        localStorage.setItem('mock_token', mockToken);
      } else {
        const provider = new GoogleAuthProvider();
        await signInWithPopup(auth, provider);
      }
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      if (isMockMode || !auth) {
        localStorage.removeItem('mock_user');
        localStorage.removeItem('mock_token');
        setUser(null);
        setToken(null);
      } else {
        await signOut(auth);
      }
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    if (isMockMode || !auth) {
      await new Promise((resolve) => setTimeout(resolve, 500));
      alert(`[MOCK MODE] Password reset email sent to: ${email}`);
    } else {
      await sendPasswordResetEmail(auth, email);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        loginWithGoogle,
        logout,
        resetPassword,
        isMockMode
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
