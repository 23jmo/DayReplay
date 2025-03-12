import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../shared/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { currentUser, loading, initialized } = useAuth();
  const location = useLocation();

  // Allow direct access to frameratePicker regardless of auth status
  if (location.pathname === '/frameratePicker') {
    return <>{children}</>;
  }

  // Show loading state while authentication is being checked
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading authentication...</p>
        </div>
      </div>
    );
  }

  // If Firebase is not initialized, still allow access but show a warning
  if (!initialized) {
    console.warn('Firebase not initialized in ProtectedRoute');
    return <>{children}</>;
  }

  // Redirect to login if not authenticated
  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  // User is authenticated, render children
  return <>{children}</>;
};

export default ProtectedRoute;
