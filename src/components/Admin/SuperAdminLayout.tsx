import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Building2,
  LogOut,
  Moon,
  Sun,
  Monitor,
  Shield
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { useSuperAdminStore } from '../../store/superAdminStore';
import { UserProfileDropdown } from '../UI/UserProfileDropdown';

// Admin Pages
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminCommunities } from './pages/AdminCommunities';
import { AdminUsers } from './pages/AdminUsersPage';

export const SuperAdminLayout: React.FC = () => {
  const { signOut } = useAuthStore();
  const { theme, setTheme } = useUIStore();
  const { activeAdminSection, setActiveAdminSection } = useSuperAdminStore();
  const location = useLocation();
  const navigate = useNavigate();

  // Update active section based on current route
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/admin/communities')) {
      setActiveAdminSection('communities');
    } else if (path.includes('/admin/users')) {
      setActiveAdminSection('users');
    } else {
      setActiveAdminSection('dashboard');
    }
  }, [location.pathname, setActiveAdminSection]);

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: '/admin/dashboard'
    },
    {
      id: 'communities',
      label: 'Communities',
      icon: Building2,
      path: '/admin/communities'
    },
    {
      id: 'users',
      label: 'Users',
      icon: Users,
      path: '/admin/users'
    }
  ];

  const themeOptions = [
    { value: 'light', icon: Sun, label: 'Light' },
    { value: 'dark', icon: Moon, label: 'Dark' },
    { value: 'system', icon: Monitor, label: 'System' }
  ];

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                Super Admin
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Platform Control
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeAdminSection === item.id;
            
            return (
              <motion.button
                key={item.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  isActive
                    ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </motion.button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
          {/* Theme Selector */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Theme
            </span>
            <div className="flex space-x-1">
              {themeOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    onClick={() => setTheme(option.value as any)}
                    className={`p-2 rounded-md transition-colors ${
                      theme === option.value
                        ? 'bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400'
                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                    title={option.label}
                  >
                    <Icon size={16} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Sign Out */}
          <button
            onClick={handleSignOut}
            className="w-full flex items-center space-x-3 px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header with User Profile */}
        <div className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-6 flex-shrink-0">
          {/* Left side - Page title */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {activeAdminSection === 'dashboard' && '📊 Platform Analytics'}
              {activeAdminSection === 'communities' && '🏢 Community Management'}
              {activeAdminSection === 'users' && '👥 User Management'}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Super Admin Control Panel
            </p>
          </div>

          {/* Right side - User Profile */}
          <div className="flex items-center space-x-4">
            <UserProfileDropdown />
          </div>
        </div>

        {/* Page Content - Allow scrolling */}
        <div className="flex-1 min-h-0">
          <Routes>
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="communities" element={<AdminCommunities />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="" element={<Navigate to="dashboard" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};
