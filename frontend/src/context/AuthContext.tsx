import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail, 
  signInWithPopup, 
  onAuthStateChanged,
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence
} from 'firebase/auth';
import type { User as FirebaseUser } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { useQueryClient } from '@tanstack/react-query';
import { 
  auth, 
  db, 
  googleProvider, 
  isMockMode as firebaseIsMockMode, 
  getFriendlyErrorMessage, 
  firebaseConfig 
} from '../firebase';

interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  role: 'user' | 'admin';
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  loginWithGoogle: (rememberMe?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  isMockMode: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  // Synchronize authentication status
  useEffect(() => {
    // Debugging authentication state console logs without exposing API secrets
    console.log("=== Firebase Auth State Audit ===");
    console.log("Active Project ID:", firebaseConfig.projectId);
    console.log("Using Mock Auth Mode:", firebaseIsMockMode);
    
    if (firebaseIsMockMode || !auth) {
      // Mock auth initial state load
      const savedUser = localStorage.getItem('mock_user') || sessionStorage.getItem('mock_user');
      const savedToken = localStorage.getItem('mock_token') || sessionStorage.getItem('mock_token');
      if (savedUser && savedToken) {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
        console.log("Mock Auth Session Loaded:", JSON.parse(savedUser).email);
      } else {
        console.log("No active Mock Auth Session.");
      }
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      console.log("onAuthStateChanged Triggered. User:", firebaseUser ? firebaseUser.email : "NULL");
      if (firebaseUser) {
        try {
          const idToken = await firebaseUser.getIdToken();
          setToken(idToken);
          
          // Determine token cache based on rememberMe selection
          const isRemembered = localStorage.getItem('remember_me') !== 'false';
          if (isRemembered) {
            localStorage.setItem('fb_token', idToken);
            sessionStorage.removeItem('fb_token');
          } else {
            sessionStorage.setItem('fb_token', idToken);
            localStorage.removeItem('fb_token');
          }
          localStorage.removeItem('mock_token');
          sessionStorage.removeItem('mock_token');
          
          const profile: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
            photoURL: firebaseUser.photoURL || null,
            role: firebaseUser.email?.endsWith('@unicomm.ai') ? 'admin' : 'user'
          };
          setUser(profile);
        } catch (tokenErr) {
          console.error("Failed to retrieve ID token:", tokenErr);
        }
      } else {
        setUser(null);
        setToken(null);
        localStorage.removeItem('fb_token');
        sessionStorage.removeItem('fb_token');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string, rememberMe: boolean = true) => {
    setLoading(true);
    try {
      queryClient.clear();
      if (firebaseIsMockMode || !auth) {
        // Mock implementation
        await new Promise((resolve) => setTimeout(resolve, 800)); // simulate network delay
        if (password.length < 8) {
          throw new Error("Password must be at least 8 characters.");
        }
        
        const mockUid = "usr_" + email.split('@')[0];
        const mockUser: UserProfile = {
          uid: mockUid,
          email: email,
          displayName: email.split('@')[0].toUpperCase(),
          photoURL: null,
          role: email.startsWith("admin") ? 'admin' : 'user'
        };
        const mockToken = mockUid === "usr_admin" ? "mock-token-admin" : `mock-token-${mockUid}`;
        
        setUser(mockUser);
        setToken(mockToken);
        if (rememberMe) {
          localStorage.setItem('mock_user', JSON.stringify(mockUser));
          localStorage.setItem('mock_token', mockToken);
        } else {
          sessionStorage.setItem('mock_user', JSON.stringify(mockUser));
          sessionStorage.setItem('mock_token', mockToken);
        }
      } else {
        localStorage.setItem('remember_me', rememberMe ? 'true' : 'false');
        // Set persistence based on rememberMe checkbox
        const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
        await setPersistence(auth, persistence);
        
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;

        // Update lastLogin in Firestore
        if (db) {
          try {
            await setDoc(doc(db, "users", firebaseUser.uid), {
              lastLogin: serverTimestamp()
            }, { merge: true });
            console.log("Firestore lastLogin updated for user:", firebaseUser.uid);
          } catch (fsErr) {
            console.warn("Failed to update lastLogin in Firestore:", fsErr);
          }
        }
      }
    } catch (err: any) {
      const friendlyMsg = getFriendlyErrorMessage(err);
      throw new Error(friendlyMsg);
    } finally {
      setLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    setLoading(true);
    try {
      queryClient.clear();
      if (firebaseIsMockMode || !auth) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        if (password.length < 8) {
          throw new Error("Password must be at least 8 characters.");
        }
        
        const mockUid = "usr_" + email.split('@')[0];
        const mockUser: UserProfile = {
          uid: mockUid,
          email: email,
          displayName: name,
          photoURL: null,
          role: 'user'
        };
        const mockToken = `mock-token-${mockUid}`;
        
        setUser(mockUser);
        setToken(mockToken);
        localStorage.setItem('mock_user', JSON.stringify(mockUser));
        localStorage.setItem('mock_token', mockToken);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;
        
        // Write to Firestore /users/{uid}
        if (db) {
          try {
            await setDoc(doc(db, "users", firebaseUser.uid), {
              uid: firebaseUser.uid,
              name: name,
              email: email,
              photoURL: firebaseUser.photoURL || null,
              createdAt: serverTimestamp(),
              lastLogin: serverTimestamp(),
              role: 'user'
            });
            console.log("User document created in Firestore for UID:", firebaseUser.uid);
          } catch (fsErr) {
            console.warn("Failed to write user to Firestore:", fsErr);
            throw fsErr;
          }
        }
      }
    } catch (err: any) {
      const friendlyMsg = getFriendlyErrorMessage(err);
      throw new Error(friendlyMsg);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (rememberMe: boolean = true) => {
    setLoading(true);
    try {
      queryClient.clear();
      if (firebaseIsMockMode || !auth) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        const mockUser: UserProfile = {
          uid: "usr_google_mock",
          email: "google.user@gmail.com",
          displayName: "Google Mock User",
          photoURL: null,
          role: 'user'
        };
        const mockToken = "mock-token-usr_google_mock";
        setUser(mockUser);
        setToken(mockToken);
        localStorage.setItem('mock_user', JSON.stringify(mockUser));
        localStorage.setItem('mock_token', mockToken);
      } else {
        localStorage.setItem('remember_me', rememberMe ? 'true' : 'false');
        const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
        await setPersistence(auth, persistence);
        
        const userCredential = await signInWithPopup(auth, googleProvider);
        const firebaseUser = userCredential.user;
        
        // Ensure user document exists in Firestore and update lastLogin
        if (db) {
          try {
            await setDoc(doc(db, "users", firebaseUser.uid), {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || "User",
              email: firebaseUser.email,
              photoURL: firebaseUser.photoURL || null,
              lastLogin: serverTimestamp(),
              role: 'user'
            }, { merge: true });
            console.log("Google user synced with Firestore for UID:", firebaseUser.uid);
          } catch (fsErr) {
            console.warn("Failed to sync Google user to Firestore:", fsErr);
          }
        }
      }
    } catch (err: any) {
      const friendlyMsg = getFriendlyErrorMessage(err);
      throw new Error(friendlyMsg);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      queryClient.clear();
      if (firebaseIsMockMode || !auth) {
        localStorage.removeItem('mock_user');
        localStorage.removeItem('mock_token');
        sessionStorage.removeItem('mock_user');
        sessionStorage.removeItem('mock_token');
        setUser(null);
        setToken(null);
      } else {
        await signOut(auth);
        localStorage.removeItem('fb_token');
        sessionStorage.removeItem('fb_token');
        localStorage.removeItem('remember_me');
        setUser(null);
        setToken(null);
      }
    } catch (err: any) {
      const friendlyMsg = getFriendlyErrorMessage(err);
      throw new Error(friendlyMsg);
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      if (firebaseIsMockMode || !auth) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        alert(`[MOCK MODE] Password reset email sent to: ${email}`);
      } else {
        await sendPasswordResetEmail(auth, email);
      }
    } catch (err: any) {
      const friendlyMsg = getFriendlyErrorMessage(err);
      throw new Error(friendlyMsg);
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
        isMockMode: firebaseIsMockMode
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
