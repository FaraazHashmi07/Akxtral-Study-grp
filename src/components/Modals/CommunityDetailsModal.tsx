import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Users, Tag, Lock, Eye, Calendar, User } from 'lucide-react';
import { Community } from '../../types';

interface CommunityDetailsModalProps {
  community: Community;
  onClose: () => void;
  onJoin: () => void;
  isJoining?: boolean;
  hasPendingRequest?: boolean;
}

const CommunityDetailsModal: React.FC<CommunityDetailsModalProps> = ({ community, onClose, onJoin, isJoining = false, hasPendingRequest = false }) => {
  if (!community) return null;

  const getCommunityColor = (category: string) => {
    const colors = {
      'study-group': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'project-team': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'social': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'professional': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'hobby': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      'other': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    };
    return colors[category as keyof typeof colors] || colors.other;
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  return (
    <AnimatePresence>
      {community && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          >
            {/* Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Community Details
                </h2>
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500 dark:text-gray-400" />
                </button>
              </div>
              
              {/* Content */}
              <div className="p-4 space-y-4">
                {/* Community Header */}
                <div className="flex items-start space-x-3">
                  <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white font-semibold flex-shrink-0">
                    {community.iconUrl ? (
                      <img
                        src={community.iconUrl}
                        alt={community.name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      community.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-bold text-gray-900 dark:text-white truncate">
                        {community.name}
                      </h3>
                      {community.visibility === 'private' ? (
                        <Lock size={16} className="text-gray-400 flex-shrink-0" />
                      ) : (
                        <Eye size={16} className="text-gray-400 flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center space-x-3 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center space-x-1">
                        <Users size={14} />
                        <span>{community.memberCount} members</span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs ${getCommunityColor(community.category)}`}>
                        {community.category.replace('-', ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    Description
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {community.description || (
                        <span className="text-gray-500 dark:text-gray-400 italic">
                          No description available
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Tags */}
                {community.tags && community.tags.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      Tags
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {community.tags.slice(0, 4).map(tag => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full"
                        >
                          <Tag size={10} className="mr-1" />
                          {tag}
                        </span>
                      ))}
                      {community.tags.length > 4 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 px-2 py-1">
                          +{community.tags.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Community Info */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                    Information
                  </h4>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Visibility:</span>
                      <div className="flex items-center space-x-1">
                        {community.visibility === 'private' ? (
                          <>
                            <Lock size={14} className="text-gray-500" />
                            <span className="text-gray-900 dark:text-white capitalize">Private</span>
                          </>
                        ) : (
                          <>
                            <Eye size={14} className="text-gray-500" />
                            <span className="text-gray-900 dark:text-white capitalize">Public</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Join Approval:</span>
                      <span className="text-gray-900 dark:text-white">
                        {community.requiresApproval ? 'Required' : 'Not Required'}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Created:</span>
                      <span className="text-gray-900 dark:text-white">
                        {formatDate(community.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

              </div>
              
              {/* Action Buttons */}
              <div className="flex space-x-2 p-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={onClose}
                  className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm"
                >
                  Close
                </button>
                
                <button
                  onClick={onJoin}
                  disabled={isJoining || hasPendingRequest}
                  className={`flex-1 px-3 py-2 text-white text-sm rounded-lg transition-colors flex items-center justify-center space-x-2 ${
                    isJoining || hasPendingRequest
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {isJoining && (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  )}
                  <span>
                    {isJoining
                      ? 'Joining...'
                      : hasPendingRequest
                        ? 'Request Pending'
                        : community.requiresApproval
                          ? 'Request to Join'
                          : 'Join'
                    }
                  </span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CommunityDetailsModal;