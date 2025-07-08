import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUIStore } from '../../store/uiStore';
import { useCommunityStore } from '../../store/communityStore';
import { CommunityRail } from './CommunityRail';
import { CommunitySidebar } from './CommunitySidebar';
import { MainContent } from './MainContent';
import { CommandPalette } from '../CommandPalette/CommandPalette';
import { NotificationPanel } from '../Notifications/NotificationPanel';
import { ToastContainer } from '../UI/ToastContainer';
import { ModalContainer } from '../UI/ModalContainer';

interface DiscordLayoutProps {
  children?: React.ReactNode;
}

export const DiscordLayout: React.FC<DiscordLayoutProps> = ({ children }) => {
  const { 
    sidebarCollapsed, 
    activeCommunityId, 
    commandPaletteOpen,
    notificationPanelOpen,
    activeModal
  } = useUIStore();
  
  const { activeCommunity } = useCommunityStore();

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Keyboard shortcuts are handled in the UI store
      // This is just for any additional layout-specific shortcuts
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden">
      {/* Community Rail - Always visible */}
      <CommunityRail />
      
      {/* Secondary Sidebar - Only visible when a community is selected */}
      <AnimatePresence>
        {activeCommunityId && !sidebarCollapsed && (
          <motion.div
            initial={{ x: -240, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -240, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="w-60 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-shrink-0"
          >
            <CommunitySidebar />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <MainContent>
          {children}
        </MainContent>
      </div>
      
      {/* Overlays */}
      <AnimatePresence>
        {/* Command Palette */}
        {commandPaletteOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-20"
          >
            <CommandPalette />
          </motion.div>
        )}
        
        {/* Notification Panel */}
        {notificationPanelOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-40 flex items-start justify-end"
          >
            <motion.div
              initial={{ x: 400 }}
              animate={{ x: 0 }}
              exit={{ x: 400 }}
              className="mt-16 mr-4"
            >
              <NotificationPanel />
            </motion.div>
          </motion.div>
        )}
        
        {/* Modal Container */}
        {activeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          >
            <ModalContainer />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Toast Notifications */}
      <ToastContainer />
    </div>
  );
};

// Layout variants for different screen sizes
export const DiscordLayoutMobile: React.FC<DiscordLayoutProps> = ({ children }) => {
  const { 
    sidebarCollapsed, 
    activeCommunityId,
    setSidebarCollapsed
  } = useUIStore();

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden">
      {/* Mobile: Overlay sidebar */}
      <AnimatePresence>
        {!sidebarCollapsed && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
              onClick={() => setSidebarCollapsed(true)}
            />
            
            {/* Sidebar */}
            <motion.div
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              className="fixed left-0 top-0 h-full w-70 bg-white dark:bg-gray-800 z-40 md:hidden flex"
            >
              <CommunityRail />
              {activeCommunityId && <CommunitySidebar />}
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
      {/* Main Content - Full width on mobile */}
      <div className="flex-1 flex flex-col">
        <MainContent>
          {children}
        </MainContent>
      </div>
      
      {/* Mobile overlays */}
      <ToastContainer />
    </div>
  );
};

// Responsive layout wrapper
export const ResponsiveDiscordLayout: React.FC<DiscordLayoutProps> = ({ children }) => {
  const [isMobile, setIsMobile] = React.useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (isMobile) {
    return <DiscordLayoutMobile>{children}</DiscordLayoutMobile>;
  }

  return <DiscordLayout>{children}</DiscordLayout>;
};
