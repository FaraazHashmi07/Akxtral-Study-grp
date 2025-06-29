import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  MessageSquare, 
  Calendar, 
  BookOpen, 
  Plus, 
  Search,
  Filter,
  ChevronRight,
  UserPlus,
  UserMinus,
  TrendingUp,
  Clock,
  Hash
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';
import { Community, SubCommunity } from '../../types';

export const CommunitiesView: React.FC = () => {
  const { 
    communities, 
    joinCommunity, 
    leaveCommunity, 
    joinSubCommunity, 
    leaveSubCommunity 
  } = useAppStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedCommunities, setExpandedCommunities] = useState<Set<string>>(new Set());

  const categories = [
    { id: 'all', name: 'All Communities', icon: '🌐' },
    { id: 'mathematics', name: 'Mathematics', icon: '📐' },
    { id: 'physics', name: 'Physics', icon: '⚛️' },
    { id: 'chemistry', name: 'Chemistry', icon: '🧪' },
    { id: 'biology', name: 'Biology', icon: '🧬' },
    { id: 'computer-science', name: 'Computer Science', icon: '💻' },
    { id: 'engineering', name: 'Engineering', icon: '⚙️' },
    { id: 'literature', name: 'Literature', icon: '📚' },
    { id: 'history', name: 'History', icon: '🏛️' }
  ];

  const filteredCommunities = communities.filter(community => {
    const matchesSearch = community.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         community.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || community.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleCommunityExpansion = (communityId: string) => {
    const newExpanded = new Set(expandedCommunities);
    if (newExpanded.has(communityId)) {
      newExpanded.delete(communityId);
    } else {
      newExpanded.add(communityId);
    }
    setExpandedCommunities(newExpanded);
  };

  const handleJoinCommunity = (communityId: string) => {
    joinCommunity(communityId);
  };

  const handleLeaveCommunity = (communityId: string) => {
    leaveCommunity(communityId);
  };

  const handleJoinSubCommunity = (subCommunityId: string) => {
    joinSubCommunity(subCommunityId);
  };

  const handleLeaveSubCommunity = (subCommunityId: string) => {
    leaveSubCommunity(subCommunityId);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Communities</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Discover and join academic communities to enhance your learning
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Create Community</span>
        </motion.button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search communities..."
            className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-gray-500" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white"
          >
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.icon} {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Communities Grid */}
      <div className="space-y-4">
        {filteredCommunities.map((community) => (
          <motion.div
            key={community.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            {/* Main Community */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-16 h-16 ${community.color} rounded-xl flex items-center justify-center text-2xl`}>
                  {community.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {community.name}
                    </h3>
                    {community.isJoined && (
                      <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs px-2 py-1 rounded-full">
                        Joined
                      </span>
                    )}
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    {community.description}
                  </p>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                    <div className="flex items-center space-x-1">
                      <Users className="w-4 h-4" />
                      <span>{community.memberCount} members</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <TrendingUp className="w-4 h-4" />
                      <span>{community.activeMembers} active</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>Last activity: {community.lastActivity.toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {community.isJoined ? (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleLeaveCommunity(community.id)}
                    className="flex items-center space-x-2 px-4 py-2 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <UserMinus className="w-4 h-4" />
                    <span>Leave</span>
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleJoinCommunity(community.id)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Join</span>
                  </motion.button>
                )}
                {community.subCommunities.length > 0 && (
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => toggleCommunityExpansion(community.id)}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <ChevronRight className={`w-5 h-5 transition-transform ${
                      expandedCommunities.has(community.id) ? 'rotate-90' : ''
                    }`} />
                  </motion.button>
                )}
              </div>
            </div>

            {/* Sub-Communities */}
            <AnimatePresence>
              {expandedCommunities.has(community.id) && community.subCommunities.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-6 pl-6 border-l-2 border-gray-200 dark:border-gray-700 space-y-4"
                >
                  {community.subCommunities.map((subCommunity) => (
                    <motion.div
                      key={subCommunity.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 ${subCommunity.color} rounded-lg flex items-center justify-center text-lg`}>
                            {subCommunity.icon}
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium text-gray-900 dark:text-white">
                                {subCommunity.name}
                              </h4>
                              {subCommunity.isJoined && (
                                <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs px-2 py-1 rounded-full">
                                  Joined
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {subCommunity.description}
                            </p>
                            <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500 dark:text-gray-400">
                              <div className="flex items-center space-x-1">
                                <Users className="w-3 h-3" />
                                <span>{subCommunity.memberCount}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <MessageSquare className="w-3 h-3" />
                                <span>{subCommunity.discussionCount}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <BookOpen className="w-3 h-3" />
                                <span>{subCommunity.resourceCount}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Calendar className="w-3 h-3" />
                                <span>{subCommunity.eventCount}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {subCommunity.isJoined ? (
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleLeaveSubCommunity(subCommunity.id)}
                              className="flex items-center space-x-1 px-3 py-1 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-600 rounded text-sm hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            >
                              <UserMinus className="w-3 h-3" />
                              <span>Leave</span>
                            </motion.button>
                          ) : (
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleJoinSubCommunity(subCommunity.id)}
                              className="flex items-center space-x-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                            >
                              <UserPlus className="w-3 h-3" />
                              <span>Join</span>
                            </motion.button>
                          )}
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                          >
                            <Hash className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>

      {filteredCommunities.length === 0 && (
        <div className="text-center py-12">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No communities found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Try adjusting your search or filter criteria
          </p>
        </div>
      )}
    </div>
  );
};