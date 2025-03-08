import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  getFirebaseAuth,
  initializeFirebase,
  signInWithGoogle,
} from './firebase';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, Auth } from 'firebase/auth';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  initialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [auth, setAuth] = useState<Auth | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Initialize Firebase
  useEffect(() => {
    const initialize = async () => {
      try {
        const { auth: firebaseAuth } = await initializeFirebase();
        setAuth(firebaseAuth);
        setInitialized(true);
      } catch (error) {
        console.error('Failed to initialize Firebase in AuthContext:', error);
        setInitialized(true); // Still mark as initialized to prevent infinite loading
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, []);

  // Subscribe to auth state changes once auth is initialized
  useEffect(() => {
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);

      // Redirect to home page if user is logged in and on login or root page
      // Skip redirect for other pages like frameratePicker
      if (
        user &&
        (location.pathname === '/login' || location.pathname === '/')
      ) {
        navigate('/home');
      }
    });

    // Cleanup subscription
    return unsubscribe;
  }, [auth, navigate, location.pathname]);

  // Auth functions
  const login = async (email: string, password: string) => {
    if (!auth) throw new Error('Firebase auth not initialized');
    await signInWithEmailAndPassword(auth, email, password);
    navigate('/home'); // Redirect to home page after login
  };

  const loginWithGoogle = async () => {
    try {
      console.log('Starting Google authentication from AuthContext...');
      const result = await signInWithGoogle();
      console.log('Google authentication successful:', result);

      // If we got a result, we're good to go
      if (result) {
        navigate('/home'); // Redirect to home page after Google login
      } else {
        // If we didn't get a result, we need to wait for the redirect result
        console.log('Waiting for redirect result...');
        // The auth state change listener will handle the redirect
      }
    } catch (error) {
      console.error('Google login error in AuthContext:', error);

      // Check if this is a known error that we can handle
      if (error instanceof Error) {
        if (
          error.message.includes('popup-blocked') ||
          error.message.includes('popup-closed-by-user') ||
          error.message.includes('internal-error')
        ) {
          console.log('Popup issue detected, will try alternative method...');
          // The error is already being handled in the Login component
        }
      }

      throw error;
    }
  };

  const signup = async (email: string, password: string) => {
    if (!auth) throw new Error('Firebase auth not initialized');
    await createUserWithEmailAndPassword(auth, email, password);
    navigate('/home'); // Redirect to home page after signup
  };

  const logout = async () => {
    if (!auth) throw new Error('Firebase auth not initialized');
    await signOut(auth);
    navigate('/login'); // Redirect to login page after logout
  };

  const value = {
    currentUser,
    loading,
    initialized,
    login,
    loginWithGoogle,
    signup,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
