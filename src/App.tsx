import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from './store/authStore';
import { useUIStore } from './store/uiStore';
import { useCommunityStore } from './store/communityStore';

// Components
import { LoginForm } from './components/Auth/LoginForm';
import { TwoFactorModal } from './components/Auth/TwoFactorModal';
import { ResponsiveDiscordLayout } from './components/Layout/DiscordLayout';
import { LandingPage } from './components/Landing/LandingPage';



function App() {
  const { user, loading, showTwoFactor, initialize } = useAuthStore();
  const { theme } = useUIStore();
  const { loadJoinedCommunities } = useCommunityStore();
  const [showLogin, setShowLogin] = React.useState(false);

  // Initialize Firebase auth listener
  useEffect(() => {
    const unsubscribe = initialize();
    return () => unsubscribe && unsubscribe();
  }, [initialize]);

  // Load user's communities when authenticated
  useEffect(() => {
    if (user) {
      loadJoinedCommunities();
    }
  }, [user, loadJoinedCommunities]);

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

  // Show landing page or login if not authenticated
  if (!user) {
    if (showLogin) {
      return (
        <>
          <LoginForm onBackToLanding={() => setShowLogin(false)} />
          {showTwoFactor && <TwoFactorModal />}
        </>
      );
    }

    return (
      <>
        <LandingPage onGetStarted={() => setShowLogin(true)} />
        {showTwoFactor && <TwoFactorModal />}
      </>
    );
  }

  // Main authenticated app
  return (
    <>
      <ResponsiveDiscordLayout />
      {showTwoFactor && <TwoFactorModal />}
    </>
  );
}

export default App;