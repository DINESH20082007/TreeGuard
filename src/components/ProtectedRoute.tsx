import React from 'react';
import { Navigate, useLocation, Outlet } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../services/auth';

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
  children?: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles, children }) => {
  const { isAuthenticated, isLoading, role } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-forest-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-forest-800">Loading session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && (!role || !allowedRoles.includes(role))) {
    // Redirect to the appropriate home base for the user's role
    const fallbackPath = role === 'admin' ? '/app/admin' : role === 'inspector' ? '/app/inspector' : '/app';
    return <Navigate to={fallbackPath} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

interface PublicOnlyRouteProps {
  children?: React.ReactNode;
}

export const PublicOnlyRoute: React.FC<PublicOnlyRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading, role } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-forest-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-forest-800">Loading session...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    const homePath = role === 'admin' ? '/app/admin' : role === 'inspector' ? '/app/inspector' : '/app';
    return <Navigate to={homePath} replace />;
  }

  return children ? <>{children}</> : <Outlet />;
};

export default ProtectedRoute;

