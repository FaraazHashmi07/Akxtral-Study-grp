import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Pin, AlertTriangle, MoreVertical, Trash2, Edit3 } from 'lucide-react';
import { format } from 'date-fns';
import { Announcement } from '../../types';
import { useAnnouncementStore } from '../../store/announcementStore';
import { useAuthStore } from '../../store/authStore';
import { useCommunityStore } from '../../store/communityStore';
import { MessageReactions } from '../Chat/MessageReactions';
import { EmojiText } from '../Chat/EmojiText';
import { isCommunityAdmin } from '../../lib/authorization';

interface AnnouncementCardProps {
  announcement: Announcement;
}

const quickReactions = ['👍', '❤️', '😂', '😮', '🤔', '👏'];

export const AnnouncementCard: React.FC<AnnouncementCardProps> = ({ announcement }) => {
  const { toggleAnnouncementReaction, deleteAnnouncement } = useAnnouncementStore();
  const { user } = useAuthStore();
  const { activeCommunity } = useCommunityStore();
  const [showActions, setShowActions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const isAuthor = user?.uid === announcement.authorId;
  const isAdmin = activeCommunity?.id ? isCommunityAdmin(user, activeCommunity.id) : false;
  const canDelete = isAuthor || isAdmin;

  const handleReaction = (emoji: string) => {
    if (activeCommunity?.id) {
      toggleAnnouncementReaction(activeCommunity.id, announcement.id, emoji);
    }
  };

  const handleDelete = async () => {
    if (canDelete && activeCommunity?.id && window.confirm('Are you sure you want to delete this announcement?')) {
      await deleteAnnouncement(activeCommunity.id, announcement.id);
    }
    setShowMenu(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${
        announcement.isPinned 
          ? 'ring-2 ring-blue-200 dark:ring-blue-800 bg-blue-50/50 dark:bg-blue-900/10' 
          : ''
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => {
        setShowActions(false);
        setShowMenu(false);
      }}
    >
      {/* Pinned/Important Indicators */}
      {(announcement.isPinned || announcement.isImportant) && (
        <div className="flex items-center space-x-2 px-6 pt-4 pb-2">
          {announcement.isPinned && (
            <div className="flex items-center space-x-1 text-blue-600 dark:text-blue-400">
              <Pin className="w-4 h-4" />
              <span className="text-xs font-medium">Pinned</span>
            </div>
          )}
          {announcement.isImportant && (
            <div className="flex items-center space-x-1 text-orange-600 dark:text-orange-400">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-xs font-medium">Important</span>
            </div>
          )}
        </div>
      )}

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-3 flex-1">
            {/* Avatar */}
            <img
              src={announcement.authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(announcement.authorName)}&background=random`}
              alt={announcement.authorName}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            />
            
            {/* Author Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <span className="font-medium text-gray-900 dark:text-white">
                  {announcement.authorName}
                </span>
                <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200 text-xs font-medium rounded-full">
                  Admin
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {format(announcement.createdAt, 'MMM d, yyyy • h:mm a')}
                {announcement.updatedAt && (
                  <span className="ml-2">(edited)</span>
                )}
              </p>
            </div>
          </div>

          {/* Actions Menu */}
          {showActions && canDelete && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute right-0 top-8 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10"
                >
                  <button
                    onClick={handleDelete}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Announcement</span>
                  </button>
                </motion.div>
              )}
            </div>
          )}
        </div>

        {/* Title */}
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
          {announcement.title}
        </h3>

        {/* Content */}
        <div className="prose prose-sm dark:prose-invert max-w-none mb-4">
          <EmojiText 
            content={announcement.content}
            className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap"
          />
        </div>

        {/* Quick Reactions */}
        {showActions && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center space-x-1 mb-4"
          >
            <div className="flex items-center bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-1">
              {quickReactions.slice(0, 6).map((emoji) => (
                <motion.button
                  key={emoji}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleReaction(emoji)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded transition-colors"
                  title={`React with ${emoji}`}
                >
                  <span className="text-sm">{emoji}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Reactions Display */}
        {announcement.reactions && announcement.reactions.length > 0 && (
          <MessageReactions 
            reactions={announcement.reactions}
            onReaction={handleReaction}
            currentUserId={user?.uid || ''}
          />
        )}
      </div>
    </motion.div>
  );
};
