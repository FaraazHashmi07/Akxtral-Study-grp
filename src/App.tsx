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
  // Removed loadJoinedCommunities from destructuring to prevent infinite re-renders
  const [showLogin, setShowLogin] = React.useState(false);
  const [wasAuthenticated, setWasAuthenticated] = React.useState(false);
  const [isInitialized, setIsInitialized] = React.useState(false);

  // Initialize Firebase auth listener
  useEffect(() => {
    const unsubscribe = initialize();
    
    // Mark as initialized after a short delay to ensure auth state is settled
    const initTimer = setTimeout(() => {
      setIsInitialized(true);
    }, 1000);
    
    return () => {
      clearTimeout(initTimer);
      unsubscribe && unsubscribe();
    };
  }, [initialize]);

  // Load user's communities when authenticated (but not for Super Admin)
  useEffect(() => {
    // CRITICAL FIX: Don't load communities during auth loading (prevents signout issues)
    if (user && !isSuperAdmin && !loading && isInitialized) {
      // FIXED: Use getState() to avoid function dependency that causes infinite re-renders
      const { loadJoinedCommunities: loadCommunities } = useCommunityStore.getState();
      loadCommunities();
      setWasAuthenticated(true);
    } else if (!user && !loading && isInitialized) {
      // CRITICAL FIX: Reset community store immediately when user signs out
      const { reset } = useCommunityStore.getState();
      if (reset) {
        reset();
      }
    }
  }, [user, isSuperAdmin, loading, isInitialized]); // FIXED: Removed loadJoinedCommunities from dependencies

  // Show login form when user signs out
  useEffect(() => {
    // Only process redirect logic after auth is initialized
    if (!isInitialized) return;
    
    // If user was authenticated but now is null (signed out), show login form
    if (wasAuthenticated && !user && !loading && !isSuperAdmin) {
      setShowLogin(true);
      // Don't reset wasAuthenticated immediately to prevent redirect to landing page
    }
    
    // If user is authenticated, track that state
    if (user && !isSuperAdmin) {
      setWasAuthenticated(true);
    }
  }, [user, loading, isSuperAdmin, wasAuthenticated, isInitialized]);

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
    // If showLogin is true (from logout or manual trigger), always show login form
    if (showLogin) {
      return (
        <Router>
          <LoginForm onBackToLanding={() => {
            setShowLogin(false);
            setWasAuthenticated(false);
          }} />
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