import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, profile, loading, isGuest } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <p className="text-on-surface-variant font-medium">Checking authorization...</p>
        </div>
      </div>
    );
  }

  // In Guest Mode, allow viewing all pages freely without login
  if (isGuest) {
    return children;
  }

  if (!user) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = profile?.role || 'renter';
    if (!allowedRoles.includes(userRole)) {
      return (
        <div className="min-h-[60vh] flex items-center justify-center px-4">
          <div className="max-w-md w-full bg-surface-container-lowest p-8 rounded-2xl shadow-card text-center border border-outline-variant/30">
            <span className="material-symbols-outlined text-error text-5xl mb-4">block</span>
            <h2 className="text-2xl font-bold font-headline text-on-surface mb-2">Access Restricted</h2>
            <p className="text-on-surface-variant mb-6">
              You do not have the required permissions ({allowedRoles.join(', ')}) to view this page.
            </p>
            <a
              href="/"
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl bg-primary text-white font-medium hover:bg-primary-container transition"
            >
              Back to Home
            </a>
          </div>
        </div>
      );
    }
  }

  return children;
};

export default ProtectedRoute;
