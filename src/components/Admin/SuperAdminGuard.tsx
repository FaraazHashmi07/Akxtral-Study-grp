import React, { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useSuperAdminStore } from '../../store/superAdminStore';

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
  const { user, isSuperAdmin, loading } = useAuthStore();
  const { checkSuperAdminClaims, setupSuperAdminClaims } = useSuperAdminStore();
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupMessage, setSetupMessage] = useState('');

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

  const handleCheckClaims = async () => {
    setIsSettingUp(true);
    setSetupMessage('Checking super admin claims...');
    try {
      const hasClaimsNow = await checkSuperAdminClaims();
      if (hasClaimsNow) {
        setSetupMessage('Super admin claims verified! Refreshing...');
        setTimeout(() => window.location.reload(), 1000);
      } else {
        setSetupMessage('No super admin claims found. You may need to set them up.');
      }
    } catch (error) {
      setSetupMessage(`Error checking claims: ${error}`);
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleSetupClaims = async () => {
    setIsSettingUp(true);
    setSetupMessage('Setting up super admin claims with password "faraz123"...');
    try {
      const result = await setupSuperAdminClaims('faraz123');
      setSetupMessage(`Super admin setup successful! Email: ${result.email}, Password: faraz123. Refreshing...`);
      setTimeout(() => window.location.reload(), 3000);
    } catch (error) {
      setSetupMessage(`Error setting up claims: ${error}`);
    } finally {
      setIsSettingUp(false);
    }
  };

  // Show access denied if not Super Admin
  if (!isSuperAdmin) {
    if (fallback) {
      return <>{fallback}</>;
    }

    // Special case: if user is the super admin email, show setup options
    const isSuperAdminEmail = user?.email === '160422747039@mjcollege.ac.in';

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            {isSuperAdminEmail ? 'Super Admin Setup Required' : 'Access Denied'}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {isSuperAdminEmail
              ? 'You are logged in with the super admin email, but super admin claims are not set up yet.'
              : 'You don\'t have permission to access the admin panel. This area is restricted to Super Administrators only.'
            }
          </p>

          {isSuperAdminEmail && (
            <div className="space-y-4">
              <button
                onClick={handleCheckClaims}
                disabled={isSettingUp}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {isSettingUp ? 'Checking...' : 'Check Super Admin Claims'}
              </button>

              <button
                onClick={handleSetupClaims}
                disabled={isSettingUp}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {isSettingUp ? 'Setting up...' : 'Setup Super Admin Claims'}
              </button>

              {setupMessage && (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">{setupMessage}</p>
                </div>
              )}
            </div>
          )}
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


