import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Eye,
  Trash2,
  Users,
  MessageSquare,
  FileText,
  Calendar,
  AlertTriangle,
  Filter
} from 'lucide-react';
import { useSuperAdminStore } from '../../../store/superAdminStore';

export const AdminCommunities: React.FC = () => {
  const {
    communities,
    loading,
    error,
    communitySearchQuery,
    setCommunitySearchQuery,
    loadCommunities,
    deleteCommunity
  } = useSuperAdminStore();

  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);

  useEffect(() => {
    loadCommunities();
  }, [loadCommunities]);

  // Filter communities based on search and flagged status
  const filteredCommunities = communities.filter(community => {
    const matchesSearch = community.name.toLowerCase().includes(communitySearchQuery.toLowerCase()) ||
                         community.description.toLowerCase().includes(communitySearchQuery.toLowerCase()) ||
                         community.creatorEmail.toLowerCase().includes(communitySearchQuery.toLowerCase());

    const matchesFilter = showFlaggedOnly ? community.flagged : true;

    return matchesSearch && matchesFilter;
  });

  const handleDeleteCommunity = async (communityId: string) => {
    if (window.confirm('Are you sure you want to delete this community? This action cannot be undone.')) {
      await deleteCommunity(communityId);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading communities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto bg-gray-50 dark:bg-gray-900">
      {/* Search and Stats Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search communities by name, creator, or description..."
              value={communitySearchQuery}
              onChange={(e) => setCommunitySearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <div className="ml-4 flex items-center space-x-4">
            <button
              onClick={() => setShowFlaggedOnly(!showFlaggedOnly)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                showFlaggedOnly
                  ? 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Filter size={14} />
              <span>{showFlaggedOnly ? 'Show All' : 'Flagged Only'}</span>
            </button>
            <div className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg">
              {filteredCommunities.length} of {communities.length} communities
            </div>
            <div className="text-sm text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
              {communities.filter(c => c.flagged).length} flagged
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {filteredCommunities.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {showFlaggedOnly ? 'No flagged communities' : 'No communities found'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              {showFlaggedOnly
                ? 'No communities are currently flagged.'
                : communitySearchQuery
                  ? 'No communities match your search criteria.'
                  : 'No communities have been created yet.'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCommunities.map((community, index) => (
              <motion.div
                key={community.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {community.name}
                      </h3>
                      {community.flagged && (
                        <AlertTriangle className="w-4 h-4 text-red-500" title="Flagged" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      {community.description}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Created by: {community.creatorEmail}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <Users size={14} />
                    <span>{community.memberCount} members</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <MessageSquare size={14} />
                    <span>{community.messageCount} messages</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <FileText size={14} />
                    <span>{community.resourceCount} resources</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                    <Calendar size={14} />
                    <span>{community.eventCount} events</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-xs text-gray-500 dark:text-gray-500">
                    {new Date(community.createdAt).toLocaleDateString()}
                  </span>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => console.log('View community:', community.id)}
                      className="p-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="View Details"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteCommunity(community.id)}
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Delete Community"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
