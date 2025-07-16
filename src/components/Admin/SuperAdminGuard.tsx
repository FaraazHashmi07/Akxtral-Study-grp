import React from 'react';
import { useAuthStore } from '../../store/authStore';

interface SuperAdminGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Route guard that only allows Super Admin users to access protected content
 * Redirects non-Super Admin users to a fallback component or shows access denied
 */
export const SuperAdminGuard: React.FC<SuperAdminGuardProps> = ({ 
  children, 
  fallback 
}) => {
  const { isSuperAdmin, loading } = useAuthStore();

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 mb-2">Verifying Admin Access...</p>
        </div>
      </div>
    );
  }

  // Show access denied if not Super Admin
  if (!isSuperAdmin) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            You don't have permission to access the admin panel. This area is restricted to Super Administrators only.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // Render protected content for Super Admin
  return <>{children}</>;
};

/**
 * Hook to check if current user is Super Admin
 */
export const useSuperAdmin = () => {
  const { isSuperAdmin, loading, superAdminToken } = useAuthStore();
  
  return {
    isSuperAdmin,
    loading,
    superAdminToken,
    isVerified: isSuperAdmin && !loading
  };
};
