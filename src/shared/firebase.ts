import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
  Auth,
  UserCredential,
  type User,
} from 'firebase/auth';
import { app as electronApp } from 'electron';

// Re-export the Auth and User types
export type { Auth, User };

// Default empty config
const defaultConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
  measurementId: '',
};

// Load Firebase config from secure storage
const getFirebaseConfig = async () => {
  // For production: Use secure storage
  try {
    // In Electron, we can use a more secure approach
    if (
      typeof window !== 'undefined' &&
      window.electronAPI &&
      window.electronAPI.getSecureConfig
    ) {
      // Get config from main process securely
      const config = await window.electronAPI.getSecureConfig('firebase');
      if (config && config.apiKey) {
        console.log('Firebase config loaded from secure storage');
        return config;
      }
    }
  } catch (error) {
    console.error('Error loading Firebase config from secure storage:', error);
  }

  // Fallback with empty config (app will fail gracefully)
  console.warn(
    'Firebase configuration not found. Authentication will not work.',
  );
  return defaultConfig;
};

// Initialize Firebase with secure config
let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

// Helper function to check if Firebase is properly configured
export const isFirebaseConfigured = () => {
  return firebaseApp !== null && firebaseAuth !== null;
};

// Initialize asynchronously
const initializeFirebase = async () => {
  try {
    const firebaseConfig = await getFirebaseConfig();

    // Only initialize if we have a valid API key
    if (firebaseConfig.apiKey) {
      try {
        firebaseApp = initializeApp(firebaseConfig);
        firebaseAuth = getAuth(firebaseApp);

        // Set persistence to local to maintain login state
        await setPersistence(firebaseAuth, browserLocalPersistence);

        // Initialize Google provider
        googleProvider = new GoogleAuthProvider();

        // Configure Google provider with additional scopes if needed
        googleProvider.addScope('profile');
        googleProvider.addScope('email');

        // Set custom parameters
        googleProvider.setCustomParameters({
          // Force account selection even when one account is available
          prompt: 'select_account',
          // Display all accounts, not just Google Workspace accounts
          hd: '*',
        });

        console.log('Firebase initialized successfully with Google provider');
        return { app: firebaseApp, auth: firebaseAuth, googleProvider };
      } catch (initError: unknown) {
        console.error('Firebase initialization error:', initError);
        // Log more detailed error information
        if (initError instanceof Error) {
          console.error('Error message:', initError.message);
          console.error('Error stack:', initError.stack);

          // Check for CSP issues
          if (initError.message.includes('Content Security Policy')) {
            console.error(
              'CSP ERROR: Firebase initialization failed due to Content Security Policy restrictions.',
            );
            console.error(
              'Please update your CSP to allow connections to Firebase services.',
            );
          }
        }
        return { app: null, auth: null, googleProvider: null };
      }
    } else {
      console.warn('Firebase initialization skipped - no valid config');
      return { app: null, auth: null, googleProvider: null };
    }
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    return { app: null, auth: null, googleProvider: null };
  }
};

// Google sign-in function with better error handling for Electron
export const signInWithGoogle = async () => {
  if (!firebaseAuth || !googleProvider) {
    throw new Error('Firebase auth or Google provider not initialized');
  }

  try {
    console.log('Starting Google sign-in process...');

    // Try to use popup for better experience in Electron
    const result = await signInWithPopup(firebaseAuth, googleProvider);
    console.log('Google sign-in successful');
    return result;
  } catch (error: any) {
    console.error('Google sign-in error:', error);

    // If popup fails, try redirect as fallback (less ideal for Electron but might work)
    if (
      error.code === 'auth/popup-blocked' ||
      error.code === 'auth/popup-closed-by-user' ||
      error.code === 'auth/internal-error'
    ) {
      console.log('Popup failed, trying redirect method...');
      try {
        // For Electron, we need to handle this differently
        // First, check if we're in an Electron environment
        if (window.electronAPI && window.electronAPI.openExternalAuth) {
          // Use a custom IPC method to open auth in default browser
          return await window.electronAPI.openExternalAuth('google');
        } else {
          // Fallback to redirect (not ideal for Electron)
          await signInWithRedirect(firebaseAuth, googleProvider);
          return null; // Will need to handle redirect result elsewhere
        }
      } catch (redirectError) {
        console.error('Google redirect sign-in error:', redirectError);
        throw redirectError;
      }
    }

    throw error;
  }
};

// Export the initialization function
export { initializeFirebase };

// Export auth functions and types
export {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
};

// Export a function to get the auth instance
export const getFirebaseAuth = () => firebaseAuth;

// Export a function to get the app instance
export const getFirebaseApp = () => firebaseApp;
