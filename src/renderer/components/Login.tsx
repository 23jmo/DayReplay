import React, { useState, useEffect } from 'react';
import { useAuth } from '../../shared/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [isFirebaseConfigured, setIsFirebaseConfigured] = useState(false);

  const { login, signup, loginWithGoogle, initialized } = useAuth();

  // Check if Firebase is configured
  useEffect(() => {
    const checkFirebaseConfig = async () => {
      try {
        // Dynamically import to avoid build issues
        const firebase = await import('../../shared/firebase');
        setIsFirebaseConfigured(firebase.isFirebaseConfigured());
      } catch (error) {
        console.error('Error checking Firebase configuration:', error);
        setIsFirebaseConfigured(false);
      }
    };

    if (initialized) {
      checkFirebaseConfig();
    }
  }, [initialized]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignup) {
        await signup(email, password);
      } else {
        await login(email, password);
      }
    } catch (err: any) {
      console.error('Authentication error:', err);

      // Format error message for better user experience
      let errorMessage = 'Failed to authenticate';

      if (err.message) {
        if (err.message.includes('Content Security Policy')) {
          errorMessage =
            'Authentication failed due to security restrictions. Please contact support.';
          console.error(
            'CSP ERROR: Firebase authentication failed due to Content Security Policy restrictions.',
          );
        } else if (err.message.includes('Firebase')) {
          // Handle common Firebase errors
          if (
            err.code === 'auth/user-not-found' ||
            err.code === 'auth/wrong-password'
          ) {
            errorMessage = 'Invalid email or password';
          } else if (err.code === 'auth/email-already-in-use') {
            errorMessage = 'Email is already in use';
          } else if (err.code === 'auth/weak-password') {
            errorMessage = 'Password is too weak';
          } else if (err.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address';
          } else if (err.code === 'auth/network-request-failed') {
            errorMessage =
              'Network error. Please check your internet connection.';
          } else {
            errorMessage = err.message;
          }
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setGoogleLoading(true);

    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error('Google authentication error:', err);

      // Format error message for better user experience
      let errorMessage = 'Failed to authenticate with Google';

      if (err.message) {
        if (err.message.includes('Content Security Policy')) {
          errorMessage =
            'Google authentication failed due to security restrictions. Please contact support.';
        } else if (err.message.includes('popup')) {
          errorMessage =
            "Google popup was blocked. We'll try an alternative method.";

          // Try again with a slight delay to allow the user to see the message
          setTimeout(async () => {
            try {
              setError('');
              await loginWithGoogle();
            } catch (retryError: any) {
              console.error('Google retry authentication error:', retryError);
              setError('Google authentication failed. Please try again later.');
            }
          }, 1500);

          setGoogleLoading(false);
          return;
        } else if (err.message.includes('network')) {
          errorMessage =
            'Network error. Please check your internet connection.';
        } else if (err.message.includes('internal-error')) {
          errorMessage =
            "Google authentication encountered an internal error. We'll try an alternative method.";

          // Try again with a slight delay to allow the user to see the message
          setTimeout(async () => {
            try {
              setError('');
              await loginWithGoogle();
            } catch (retryError: any) {
              console.error('Google retry authentication error:', retryError);
              setError('Google authentication failed. Please try again later.');
            }
          }, 1500);

          setGoogleLoading(false);
          return;
        } else {
          errorMessage = err.message;
        }
      }

      setError(errorMessage);
    } finally {
      setGoogleLoading(false);
    }
  };

  // Show a message if Firebase is not initialized
  if (!initialized) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold mb-6 text-center">
            Firebase Not Configured
          </h2>
          <p className="text-center mb-4">
            Firebase authentication is not properly configured. Please check
            your environment variables and Firebase setup.
          </p>
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
            <p>
              Make sure you've set up your Firebase configuration using the
              setup script:
            </p>
            <pre className="mt-2 bg-gray-100 p-2 rounded">
              npm run setup:firebase
            </pre>
          </div>
        </div>
      </div>
    );
  }

  // Show a message if Firebase is initialized but not properly configured
  if (initialized && !isFirebaseConfigured) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
          <h2 className="text-2xl font-bold mb-6 text-center">
            Firebase Connection Issue
          </h2>
          <p className="text-center mb-4">
            Firebase is configured but unable to connect. This may be due to
            Content Security Policy restrictions.
          </p>
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4">
            <p>
              Please check the console for more detailed error information and
              contact support.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold mb-6 text-center">
          {isSignup ? 'Create Account' : 'Login to Day Replay'}
        </h2>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Processing...' : isSignup ? 'Sign Up' : 'Login'}
          </Button>
        </form>

        <div className="mt-4 relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">
              Or continue with
            </span>
          </div>
        </div>

        <div className="mt-4">
          <Button
            type="button"
            className="w-full flex items-center justify-center bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
            onClick={handleGoogleSignIn}
            disabled={googleLoading}
          >
            {googleLoading ? (
              'Connecting...'
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Sign in with Google
              </>
            )}
          </Button>
        </div>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setIsSignup(!isSignup)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {isSignup
              ? 'Already have an account? Login'
              : 'Need an account? Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
