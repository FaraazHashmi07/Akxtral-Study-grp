import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, Pin, Plus, Eye } from 'lucide-react';
import { useCommunityStore } from '../../store/communityStore';
import { useAnnouncementStore } from '../../store/announcementStore';
import { useAuthStore } from '../../store/authStore';
import { AnnouncementCard } from '../Announcements/AnnouncementCard';
import { CreateAnnouncementModal } from '../Modals/CreateAnnouncementModal';
import { isCommunityAdmin } from '../../lib/authorization';

export const AnnouncementsSection: React.FC = () => {
  const { activeCommunity } = useCommunityStore();
  const { 
    announcements, 
    loading, 
    error, 
    loadAnnouncements,
    getUnreadCount,
    markAllAnnouncementsAsRead,
    isAnnouncementRead
  } = useAnnouncementStore();
  const { user } = useAuthStore();
  const [showCreateModal, setShowCreateModal] = useState(false);

  // SECURITY FIX: Only show announcements if user is authenticated and has active community
  const communityAnnouncements = (activeCommunity?.id && user) ? announcements[activeCommunity.id] || [] : [];
  const unreadCount = activeCommunity?.id ? getUnreadCount(activeCommunity.id) : 0;

  // Check if user is admin - using enhanced function that includes creator check
  const isAdmin = user && activeCommunity ?
    isCommunityAdmin(user, activeCommunity.id) :
    false;

  const handleMarkAllAsRead = async () => {
    if (activeCommunity?.id && unreadCount > 0) {
      await markAllAnnouncementsAsRead(activeCommunity.id);
    }
  };

  // Debug admin status
  useEffect(() => {
    if (user && activeCommunity) {
      const basicAuthResult = isCommunityAdmin(user, activeCommunity.id);
      const authResult = isCommunityAdmin(user, activeCommunity.id);
      const isCreator = user.uid === activeCommunity.createdBy;
      const hasRole = user.communityRoles?.[activeCommunity.id]?.role === 'community_admin';

      console.log('🔐 [ANNOUNCEMENTS] Admin Status Debug:', {
        userId: user.uid,
        communityId: activeCommunity.id,
        communityCreatedBy: activeCommunity.createdBy,
        basicAuthResult,
        authResult,
        isCreator,
        hasRole,
        finalIsAdmin: isAdmin,
        userRoles: user.communityRoles
      });
    }
  }, [user, activeCommunity, isAdmin]);

  // Load announcements when component mounts or community changes
  useEffect(() => {
    if (activeCommunity?.id && user) {
      // CRITICAL FIX: Add delay to ensure membership validation completes first
      const loadTimer = setTimeout(() => {
        // Double-check user is still authenticated and community is still active
        if (user && activeCommunity?.id) {
          // FIXED: Use getState() to avoid function dependency that causes infinite re-renders
          const { loadAnnouncements: loadAnnouncementsFunc } = useAnnouncementStore.getState();
          loadAnnouncementsFunc(activeCommunity.id);
        }
      }, 100); // Small delay to allow membership validation to complete

      return () => clearTimeout(loadTimer);
    }
  }, [activeCommunity?.id, user]); // FIXED: Removed loadAnnouncements from dependencies

  // SECURITY CHECK: Don't render if no active community or user not authenticated
  if (!activeCommunity || !user) {
    console.log('🚫 [ANNOUNCEMENTS] Blocking render - missing community or user authentication');
    return null;
  }

  return (
    <>
      <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Megaphone className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                {unreadCount > 0 && (
                  <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center animate-pulse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    Announcements
                  </h1>
                  {unreadCount > 0 && (
                    <span className="px-2 py-1 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-200 text-sm font-medium rounded-full">
                      {unreadCount} unread
                    </span>
                  )}
                </div>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  Stay updated with the latest news from {activeCommunity?.name}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {unreadCount > 0 && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleMarkAllAsRead}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Eye size={20} />
                  <span>Mark All Read</span>
                </motion.button>
              )}
              {isAdmin && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Plus size={20} />
                  <span>New Announcement</span>
                </motion.button>
              )}
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          )}

          {/* Announcements List */}
          {!loading && (
            <div className="space-y-6">
              <AnimatePresence>
                {communityAnnouncements.map((announcement) => (
                  <AnnouncementCard
                    key={announcement.id}
                    announcement={announcement}
                  />
                ))}
              </AnimatePresence>

              {/* Empty State */}
              {communityAnnouncements.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-12"
                >
                  <Megaphone size={48} className="mx-auto text-gray-400 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    No announcements yet
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-6">
                    {isAdmin
                      ? 'Create your first announcement to share important updates with the community.'
                      : 'Announcements will appear here when they are posted by admins.'
                    }
                  </p>
                  {isAdmin && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowCreateModal(true)}
                      className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors mx-auto"
                    >
                      <Plus size={20} />
                      <span>Create First Announcement</span>
                    </motion.button>
                  )}
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Announcement Modal */}
      {isAdmin && (
        <CreateAnnouncementModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          communityId={activeCommunity.id}
        />
      )}
    </>
  );
};
