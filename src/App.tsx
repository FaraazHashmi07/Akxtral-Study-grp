import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from './store/authStore';
import { useAppStore } from './store/appStore';

// Components
import { LoginForm } from './components/Auth/LoginForm';
import { TwoFactorModal } from './components/Auth/TwoFactorModal';
import { Navbar } from './components/Layout/Navbar';
import { AdminDashboard } from './components/Dashboard/AdminDashboard';
import { MemberDashboard } from './components/Dashboard/MemberDashboard';
import { ChatInterface } from './components/Chat/ChatInterface';
import { NotificationPanel } from './components/Notifications/NotificationPanel';
import { CommandPalette } from './components/CommandPalette/CommandPalette';
import { CommunitiesView } from './components/Communities/CommunitiesView';
import { DatabaseManagement } from './components/Admin/DatabaseManagement';

function App() {
  const { user, isAuthenticated, showTwoFactor } = useAuthStore();
  const { isDarkMode, currentView, setCurrentView } = useAppStore();

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Show login if not authenticated
  if (!isAuthenticated) {
    return (
      <div className={isDarkMode ? 'dark' : ''}>
        <LoginForm />
        {showTwoFactor && <TwoFactorModal />}
      </div>
    );
  }

  const renderMainContent = () => {
    switch (currentView) {
      case 'dashboard':
        return user?.role === 'admin' ? <AdminDashboard /> : <MemberDashboard />;
      case 'chat':
        return <ChatInterface />;
      case 'communities':
        return <CommunitiesView />;
      case 'database':
        return <DatabaseManagement />;
      default:
        return user?.role === 'admin' ? <AdminDashboard /> : <MemberDashboard />;
    }
  };

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        
        <div className="flex">
          {/* Sidebar */}
          <motion.div
            initial={{ x: -250 }}
            animate={{ x: 0 }}
            className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 min-h-screen"
          >
            <nav className="p-4 space-y-2">
              <button
                onClick={() => setCurrentView('dashboard')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  currentView === 'dashboard'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span>🏠</span>
                <span>Dashboard</span>
              </button>
              
              <button
                onClick={() => setCurrentView('communities')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  currentView === 'communities'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span>🌐</span>
                <span>Communities</span>
              </button>
              
              <button
                onClick={() => setCurrentView('chat')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  currentView === 'chat'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span>💬</span>
                <span>Chat</span>
              </button>

              <button
                onClick={() => setCurrentView('calendar')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  currentView === 'calendar'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span>📅</span>
                <span>Calendar</span>
              </button>

              <button
                onClick={() => setCurrentView('resources')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  currentView === 'resources'
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span>📚</span>
                <span>Resources</span>
              </button>

              {user?.role === 'admin' && (
                <button
                  onClick={() => setCurrentView('database')}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                    currentView === 'database'
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <span>🗄️</span>
                  <span>Database</span>
                </button>
              )}
            </nav>
          </motion.div>

          {/* Main Content */}
          <div className="flex-1">
            <motion.main
              key={currentView}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="h-full"
            >
              {renderMainContent()}
            </motion.main>
          </div>
        </div>

        {/* Overlays */}
        <NotificationPanel />
        <CommandPalette />
      </div>
    </div>
  );
}

export default App;