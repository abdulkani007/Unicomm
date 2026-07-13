import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  browserLocalPersistence, 
  browserSessionPersistence,
  setPersistence
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ""
};

let app;
let auth: any = null;
let db: any = null;
let storage: any = null;
let isMockMode = true;

try {
  if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_FIREBASE_API_KEY" && firebaseConfig.apiKey !== "") {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    isMockMode = false;
    
    // Detailed Debugging Logs (without exposing raw API Key)
    console.log("=== Firebase Initialization Status ===");
    console.log("Initialization: SUCCESS");
    console.log("Firebase Project ID:", firebaseConfig.projectId);
    console.log("Auth Domain Connected:", firebaseConfig.authDomain);
    console.log("Firestore Status: ACTIVE");
    console.log("Storage Status: ACTIVE");
    console.log("======================================");
  } else {
    console.warn("No VITE_FIREBASE_API_KEY configured. Running in MOCK AUTH/FIRESTORE MODE.");
    isMockMode = true;
  }
} catch (error) {
  console.warn("Failed to initialize Firebase Auth:", error, "Falling back to MOCK AUTH MODE.");
  isMockMode = true;
}

const googleProvider = new GoogleAuthProvider();

export const getFriendlyErrorMessage = (error: any): string => {
  if (!error) return "An unexpected error occurred. Please try again.";
  
  const code = error.code || error.message || "";
  
  if (code.includes("auth/email-already-in-use")) {
    return "This email address is already in use by another account.";
  }
  if (code.includes("auth/weak-password")) {
    return "The password is too weak. It must be at least 8 characters long.";
  }
  if (code.includes("auth/invalid-email")) {
    return "Please enter a valid email address.";
  }
  if (code.includes("auth/network-request-failed")) {
    return "A network error occurred. Please check your internet connection and try again.";
  }
  if (code.includes("auth/operation-not-allowed")) {
    return "Unable to create your account. Please check the authentication configuration.";
  }
  if (code.includes("permission-denied") || code.includes("auth/permission-denied")) {
    return "Access denied. You do not have permission to perform this operation.";
  }
  if (code.includes("auth/user-not-found") || code.includes("auth/wrong-password") || code.includes("auth/invalid-credential") || code.includes("auth/invalid-email-password")) {
    return "Invalid email or password. Please try again.";
  }
  if (code.includes("auth/too-many-requests")) {
    return "Too many failed attempts. Access to this account has been temporarily disabled.";
  }
  
  return error.message || "An unexpected error occurred. Please try again.";
};

export { app, auth, db, storage, googleProvider, isMockMode, browserLocalPersistence, browserSessionPersistence, setPersistence, firebaseConfig };
