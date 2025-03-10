import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import type { User, Auth } from 'firebase/auth';

// Import types only
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
        // Dynamically import to avoid build issues
        const { initializeFirebase } = await import('./firebase');
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

    const setupAuthListener = async () => {
      try {
        // Dynamically import to avoid build issues
        const { onAuthStateChanged } = await import('./firebase');

        const unsubscribe = onAuthStateChanged(auth, (user) => {
          setCurrentUser(user);
          setLoading(false);

          // Redirect to home page if user is logged in and on login page
          if (
            user &&
            (location.pathname === '/login' || location.pathname === '/')
          ) {
            navigate('/home');
          }
        });

        // Cleanup subscription
        return unsubscribe;
      } catch (error) {
        console.error('Error setting up auth listener:', error);
        setLoading(false);
        return () => {}; // Return empty cleanup function
      }
    };

    setupAuthListener();
  }, [auth, navigate, location.pathname]);

  // Auth functions
  const login = async (email: string, password: string) => {
    if (!auth) throw new Error('Firebase auth not initialized');

    try {
      // Dynamically import to avoid build issues
      const { signInWithEmailAndPassword } = await import('./firebase');
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/home'); // Redirect to home page after login
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
      console.log('Starting Google authentication from AuthContext...');

      // Dynamically import to avoid build issues
      const { signInWithGoogle } = await import('./firebase');
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

    try {
      // Dynamically import to avoid build issues
      const { createUserWithEmailAndPassword } = await import('./firebase');
      await createUserWithEmailAndPassword(auth, email, password);
      navigate('/home'); // Redirect to home page after signup
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const logout = async () => {
    if (!auth) throw new Error('Firebase auth not initialized');

    try {
      // Dynamically import to avoid build issues
      const { signOut } = await import('./firebase');
      await signOut(auth);
      navigate('/login'); // Redirect to login page after logout
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
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
