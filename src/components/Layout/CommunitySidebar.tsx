import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Megaphone,
  MessageCircle,
  FolderOpen,
  Calendar,
  Hash,
  Volume2,
  Plus,
  Settings,
  Users,
  Crown,
  UserCheck,
  Trash2
} from 'lucide-react';
import { useCommunityStore } from '../../store/communityStore';
import { useChatStore } from '../../store/chatStore';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useAnnouncementStore } from '../../store/announcementStore';
import { getPendingJoinRequestsCount } from '../../services/communityService';
// Note: ChatChannel import removed - new system is community-based

export const CommunitySidebar: React.FC = () => {
  const { activeCommunity, communityMembers } = useCommunityStore();
  // Note: New chat system is community-based, not channel-based
  const { activeSection, setActiveSection, openModal } = useUIStore();
  const { user } = useAuthStore();

  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Check if user is admin - either through roles or if they created the community
  const isAdmin = user && activeCommunity && (
    user.communityRoles?.[activeCommunity.id]?.role === 'community_admin' ||
    user.uid === activeCommunity.createdBy
  );

  // Load pending join requests count for admins (removed auto-refresh to prevent infinite polling)
  useEffect(() => {
    if (isAdmin && activeCommunity) {
      const loadPendingCount = async () => {
        try {
          const count = await getPendingJoinRequestsCount(activeCommunity.id);
          setPendingRequestsCount(count);
        } catch (error) {
          console.error('❌ [SIDEBAR] Failed to load pending requests count:', error);
          // Set count to 0 on error but don't hide the admin functionality
          setPendingRequestsCount(0);
        }
      };

      loadPendingCount();
      // Removed setInterval to prevent continuous polling and auto-refresh issues
    } else {
      setPendingRequestsCount(0);
    }
  }, [isAdmin, activeCommunity?.id]);

  if (!activeCommunity) return null;

  // New chat system doesn't use channels - it's community-based
  const members = (communityMembers && activeCommunity?.id) ? (communityMembers[activeCommunity.id] || []) : [];

  // Admin check logic completed

  // Base sections available to all users
  const baseSections = [
    {
      id: 'announcements',
      name: 'Announcements',
      icon: Megaphone,
      description: 'Important community updates'
    },
    {
      id: 'chat',
      name: 'Chat',
      icon: MessageCircle,
      description: 'Real-time discussions'
    },
    {
      id: 'resources',
      name: 'Resources',
      icon: FolderOpen,
      description: 'Shared files and materials'
    },
    {
      id: 'calendar',
      name: 'Calendar',
      icon: Calendar,
      description: 'Events and study sessions'
    }
  ];

  // Admin-only sections
  const adminSections = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      icon: BarChart3,
      description: 'Community overview and analytics'
    }
  ];

  // Combine sections based on user role
  const sections = isAdmin ? [...adminSections, ...baseSections] : baseSections;

  const handleSectionClick = (sectionId: string) => {
    setActiveSection(sectionId as any);

    // If clicking on announcements, immediately mark as read for instant badge removal
    if (sectionId === 'announcements' && activeCommunity?.id) {
      const { markAnnouncementsAsRead } = useAnnouncementStore.getState();
      markAnnouncementsAsRead(activeCommunity.id);
    }

    // Note: New chat system doesn't need channel selection
  };

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-800">
      {/* Community Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center text-white font-semibold">
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
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                {activeCommunity.name}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {members.length} members
              </p>
            </div>
          </div>
          {isAdmin && (
            <div className="flex space-x-1">
              <button
                onClick={() => openModal('joinRequests', {
                  communityId: activeCommunity.id,
                  communityName: activeCommunity.name
                })}
                className="relative p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title={`Join Requests${pendingRequestsCount > 0 ? ` (${pendingRequestsCount})` : ''}`}
              >
                <UserCheck size={16} />
                {pendingRequestsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {pendingRequestsCount > 9 ? '9+' : pendingRequestsCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => openModal('communitySettings', { community: activeCommunity })}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                title="Community Settings"
              >
                <Settings size={16} />
              </button>

              <button
                onClick={() => openModal('deleteCommunity', {
                  communityId: activeCommunity.id,
                  communityName: activeCommunity.name
                })}
                className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                title="Delete Community"
              >
                <Trash2 size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-1">
          {sections.map((section) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;


            return (
              <motion.button
                key={section.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSectionClick(section.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title={section.description}
              >
                <Icon size={18} />
                <span className="font-medium">{section.name}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Note: Channel section removed - new chat system is community-based */}

        {/* Members Section */}
        <div className="mt-auto p-2">
          <button
            onClick={() => openModal('memberList', { communityId: activeCommunity.id })}
            className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Users size={18} />
            <span className="font-medium">Members</span>
            <span className="ml-auto text-sm text-gray-500 dark:text-gray-400">
              {members.length}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

// Note: ChannelItem component removed - new chat system is community-based
