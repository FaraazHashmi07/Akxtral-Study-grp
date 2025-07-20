import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Megaphone, Pin, AlertTriangle, Send } from 'lucide-react';
import { useAnnouncementStore } from '../../store/announcementStore';
import { useCommunityStore } from '../../store/communityStore';
import { useUIStore } from '../../store/uiStore';

interface CreateAnnouncementModalProps {
  isOpen: boolean;
  onClose: () => void;
  communityId: string;
}

export const CreateAnnouncementModal: React.FC<CreateAnnouncementModalProps> = ({
  isOpen,
  onClose,
  communityId
}) => {
  const { createAnnouncement, loading } = useAnnouncementStore();
  const { activeCommunity } = useCommunityStore();
  const { showToast } = useUIStore();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [isImportant, setIsImportant] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      showToast({
        type: 'error',
        title: 'Missing Information',
        message: 'Please provide both title and content for the announcement.'
      });
      return;
    }

    try {
      await createAnnouncement(communityId, {
        title: title.trim(),
        content: content.trim(),
        isPinned,
        isImportant
      });

      showToast({
        type: 'success',
        title: 'Announcement Created',
        message: 'Your announcement has been posted successfully.'
      });

      // Reset form and close modal
      setTitle('');
      setContent('');
      setIsPinned(false);
      setIsImportant(false);
      onClose();
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Failed to Create Announcement',
        message: 'There was an error creating your announcement. Please try again.'
      });
    }
  };

  const handleClose = () => {
    if (!loading) {
      setTitle('');
      setContent('');
      setIsPinned(false);
      setIsImportant(false);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-2xl mx-4 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <Megaphone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Create Announcement
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Share important updates with {activeCommunity?.name}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={loading}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Title */}
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Announcement Title
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter announcement title..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  disabled={loading}
                  maxLength={100}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {title.length}/100 characters
                </p>
              </div>

              {/* Content */}
              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Announcement Content
                </label>
                <textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your announcement content here..."
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none"
                  disabled={loading}
                  maxLength={2000}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {content.length}/2000 characters
                </p>
              </div>

              {/* Options */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Announcement Options
                </h3>

                {/* Pin Toggle */}
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    disabled={loading}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                  <div className="flex items-center space-x-2">
                    <Pin className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Pin to top of announcements
                    </span>
                  </div>
                </label>

                {/* Important Toggle */}
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isImportant}
                    onChange={(e) => setIsImportant(e.target.checked)}
                    disabled={loading}
                    className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500 dark:border-gray-600 dark:bg-gray-700"
                  />
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Mark as important
                    </span>
                  </div>
                </label>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={loading}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <motion.button
                  type="submit"
                  disabled={loading || !title.trim() || !content.trim()}
                  whileHover={{ scale: loading ? 1 : 1.02 }}
                  whileTap={{ scale: loading ? 1 : 0.98 }}
                  className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Create Announcement</span>
                    </>
                  )}
                </motion.button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
