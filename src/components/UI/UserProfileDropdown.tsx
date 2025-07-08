import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Settings, 
  LogOut, 
  Moon, 
  Sun, 
  Monitor,
  Bell,
  Shield,
  HelpCircle,
  ChevronDown
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';

export const UserProfileDropdown: React.FC = () => {
  const { user, signOut } = useAuthStore();
  const { theme, setTheme, openModal } = useUIStore();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close dropdown on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleSignOut = async () => {
    try {
      await signOut();
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to sign out:', error);
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    setIsOpen(false);
  };

  const handleOpenSettings = () => {
    openModal('userSettings');
    setIsOpen(false);
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun size={16} />;
      case 'dark':
        return <Moon size={16} />;
      case 'system':
        return <Monitor size={16} />;
      default:
        return <Monitor size={16} />;
    }
  };

  const getStatusColor = () => {
    // You can implement online/offline status here
    return 'bg-green-500'; // Online
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 p-2 rounded-lg transition-colors ${
          isOpen 
            ? 'bg-gray-100 dark:bg-gray-700' 
            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
        aria-label="User menu"
        aria-expanded={isOpen}
      >
        {/* Avatar with status indicator */}
        <div className="relative">
          <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center overflow-hidden">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || 'User'}
                className="w-full h-full object-cover"
              />
            ) : (
              <User size={16} className="text-gray-600 dark:text-gray-300" />
            )}
          </div>
          {/* Status indicator */}
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${getStatusColor()} border-2 border-white dark:border-gray-800 rounded-full`} />
        </div>

        {/* User info (hidden on mobile) */}
        <div className="hidden md:block text-left">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-32">
            {user.displayName || 'User'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-32">
            {user.email}
          </p>
        </div>

        {/* Dropdown indicator */}
        <ChevronDown 
          size={16} 
          className={`text-gray-500 dark:text-gray-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </motion.button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50"
          >
            {/* User Info Header */}
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center overflow-hidden">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      alt={user.displayName || 'User'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={20} className="text-gray-600 dark:text-gray-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user.displayName || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {user.email}
                  </p>
                  {!user.emailVerified && (
                    <p className="text-xs text-orange-600 dark:text-orange-400">
                      Email not verified
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              {/* Profile Settings */}
              <button
                onClick={handleOpenSettings}
                className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Settings size={16} />
                <span>Account Settings</span>
              </button>

              {/* Notifications */}
              <button
                onClick={() => {
                  // TODO: Implement notification settings
                  setIsOpen(false);
                }}
                className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Bell size={16} />
                <span>Notifications</span>
              </button>

              {/* Privacy */}
              <button
                onClick={() => {
                  // TODO: Implement privacy settings
                  setIsOpen(false);
                }}
                className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <Shield size={16} />
                <span>Privacy & Safety</span>
              </button>

              {/* Theme Selector */}
              <div className="px-4 py-2">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
                  Theme
                </p>
                <div className="space-y-1">
                  {[
                    { value: 'light', label: 'Light', icon: Sun },
                    { value: 'dark', label: 'Dark', icon: Moon },
                    { value: 'system', label: 'System', icon: Monitor }
                  ].map(({ value, label, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => handleThemeChange(value as any)}
                      className={`w-full flex items-center space-x-3 px-3 py-1.5 text-sm rounded transition-colors ${
                        theme === value
                          ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      }`}
                    >
                      <Icon size={14} />
                      <span>{label}</span>
                      {theme === value && (
                        <div className="ml-auto w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 dark:border-gray-700 my-2" />

              {/* Help */}
              <button
                onClick={() => {
                  // TODO: Implement help/support
                  setIsOpen(false);
                }}
                className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <HelpCircle size={16} />
                <span>Help & Support</span>
              </button>

              {/* Sign Out */}
              <button
                onClick={handleSignOut}
                className="w-full flex items-center space-x-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
