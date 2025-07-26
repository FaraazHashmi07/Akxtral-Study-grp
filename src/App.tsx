import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useCommunityStore } from './store/communityStore';

// Components
import { LoginForm } from './components/Auth/LoginForm';
import { TwoFactorModal } from './components/Auth/TwoFactorModal';
import { ResponsiveDiscordLayout } from './components/Layout/DiscordLayout';
import { LandingPage } from './components/Landing/LandingPage';

// Super Admin Components
import { SuperAdminGuard } from './components/Admin/SuperAdminGuard';
import { SuperAdminLayout } from './components/Admin/SuperAdminLayout';



function App() {
  const { user, loading, showTwoFactor, initialize, isSuperAdmin } = useAuthStore();
  const { loadJoinedCommunities } = useCommunityStore();
  const [showLogin, setShowLogin] = React.useState(false);

  // Initialize Firebase auth listener
  useEffect(() => {
    const unsubscribe = initialize();
    return () => unsubscribe && unsubscribe();
  }, [initialize]);

  // Load user's communities when authenticated (but not for Super Admin)
  useEffect(() => {
    // CRITICAL FIX: Don't load communities during auth loading (prevents signout issues)
    if (user && !isSuperAdmin && !loading) {
      console.log('🔄 [APP] Loading joined communities for authenticated user:', user.uid);
      loadJoinedCommunities();
    } else if (!user) {
      console.log('👤 [APP] User signed out, skipping community load');
    } else if (loading) {
      console.log('⏳ [APP] Auth loading, skipping community load to prevent race conditions');
    }
  }, [user, isSuperAdmin, loading, loadJoinedCommunities]);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400 mb-2">Initializing Authentication...</p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            This should only take a few seconds
          </p>
        </div>
      </div>
    );
  }

  // Show landing page or login if not authenticated (and not Super Admin)
  if (!user && !isSuperAdmin) {
    if (showLogin) {
      return (
        <Router>
          <LoginForm onBackToLanding={() => setShowLogin(false)} />
          {showTwoFactor && <TwoFactorModal />}
        </Router>
      );
    }

    return (
      <Router>
        <LandingPage onGetStarted={() => setShowLogin(true)} />
        {showTwoFactor && <TwoFactorModal />}
      </Router>
    );
  }

  // Super Admin authenticated - redirect to admin panel
  if (isSuperAdmin) {
    return (
      <Router>
        <Routes>
          <Route path="/admin/*" element={
            <SuperAdminGuard>
              <SuperAdminLayout />
            </SuperAdminGuard>
          } />
          <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
        </Routes>
        {showTwoFactor && <TwoFactorModal />}
      </Router>
    );
  }

  // Regular user authenticated app
  return (
    <Router>
      <Routes>
        <Route path="/admin/*" element={
          <SuperAdminGuard fallback={<Navigate to="/" replace />}>
            <SuperAdminLayout />
          </SuperAdminGuard>
        } />
        <Route path="*" element={<ResponsiveDiscordLayout />} />
      </Routes>
      {showTwoFactor && <TwoFactorModal />}
    </Router>
  );
}

export default App;