import React from 'react';
import { motion } from 'framer-motion';
import { Menu, Bell, Search } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useCommunityStore } from '../../store/communityStore';
import { UserProfileDropdown } from '../UI/UserProfileDropdown';

// Import section components (we'll create these next)
import { DashboardSection } from '../Sections/DashboardSection';
import { AnnouncementsSection } from '../Sections/AnnouncementsSection';
import { ChatSection } from '../Sections/ChatSection';
import { ResourcesSection } from '../Sections/ResourcesSection';
import { CalendarSection } from '../Sections/CalendarSection';
import { MeetsSection } from '../Sections/MeetsSection';
import { HomeSection } from '../Sections/HomeSection';

interface MainContentProps {
  children?: React.ReactNode;
}

export const MainContent: React.FC<MainContentProps> = ({ children }) => {
  const { 
    activeSection, 
    activeCommunityId,
    toggleSidebar,
    toggleNotificationPanel,
    setCommandPaletteOpen,
    unreadNotificationCount
  } = useUIStore();
  
  const { activeCommunity } = useCommunityStore();

  const handleSearchClick = () => {
    setCommandPaletteOpen(true);
  };

  const renderSection = () => {
    console.log('🔍 [MAIN] Rendering section:', {
      activeCommunityId,
      activeCommunity: activeCommunity?.name,
      activeSection
    });

    // Primary condition: Always show HomeSection when no community ID is set
    if (!activeCommunityId || activeCommunityId === null) {
      console.log('🏠 [MAIN] Showing HomeSection - no active community ID');
      return <HomeSection />;
    }

    // Secondary condition: If we have a community ID but no community data yet
    // This can happen during loading or state transitions
    if (!activeCommunity) {
      console.log('⏳ [MAIN] Community ID exists but no community data, showing HomeSection temporarily');
      return <HomeSection />;
    }

    // Tertiary condition: Ensure the community ID matches the active community
    if (activeCommunity.id !== activeCommunityId) {
      console.log('⚠️ [MAIN] Community ID mismatch, showing HomeSection');
      return <HomeSection />;
    }

    console.log('🏢 [MAIN] Showing community section:', activeSection);
    switch (activeSection) {
      case 'dashboard':
        return <DashboardSection />;
      case 'announcements':
        return <AnnouncementsSection />;
      case 'chat':
        return <ChatSection />;
      case 'resources':
        return <ResourcesSection />;
      case 'calendar':
        return <CalendarSection />;
      case 'meets':
        return <MeetsSection />;
      default:
        return <DashboardSection />;
    }
  };

  const getSectionTitle = () => {
    if (!activeCommunity) return 'Study Groups';
    
    switch (activeSection) {
      case 'dashboard':
        return 'Dashboard';
      case 'announcements':
        return 'Announcements';
      case 'chat':
        return 'Chat';
      case 'resources':
        return 'Resources';
      case 'calendar':
        return 'Calendar';
      case 'meets':
        return 'Meets';
      default:
        return 'Dashboard';
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Top Navigation Bar */}
      <div className="h-16 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between px-4 flex-shrink-0">
        {/* Left side */}
        <div className="flex items-center space-x-4">
          {/* Mobile menu button */}
          <button
            onClick={toggleSidebar}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors md:hidden"
          >
            <Menu size={20} />
          </button>
          
          {/* Section title */}
          <div className="flex items-center space-x-3">
            {activeCommunity && (
              <>
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-semibold">
                  {activeCommunity.iconUrl ? (
                    <img
                      src={activeCommunity.iconUrl}
                      alt={activeCommunity.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                  ) : (
                    activeCommunity.name.charAt(0).toUpperCase()
                  )}
                </div>
                <span className="text-gray-400 dark:text-gray-500">/</span>
              </>
            )}
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              {getSectionTitle()}
            </h1>
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center space-x-2">
          {/* Search button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleSearchClick}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Search (Ctrl+K)"
          >
            <Search size={20} />
          </motion.button>

          {/* Notifications button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleNotificationPanel}
            className="relative p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            title="Notifications"
          >
            <Bell size={20} />
            {unreadNotificationCount > 0 && (
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-xs text-white font-bold">
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </span>
              </div>
            )}
          </motion.button>

          {/* User Profile Dropdown */}
          <UserProfileDropdown />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden">
        <motion.div
          key={`${activeCommunityId}-${activeSection}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          className="h-full"
        >
          {children || renderSection()}
        </motion.div>
      </div>
    </div>
  );
};
