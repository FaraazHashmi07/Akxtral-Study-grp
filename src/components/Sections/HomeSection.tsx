import React from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, BookOpen, Users, Calendar, MessageCircle } from 'lucide-react';
import { useCommunityStore } from '../../store/communityStore';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';

export const HomeSection: React.FC = () => {
  const { joinedCommunities } = useCommunityStore();
  const { openModal } = useUIStore();
  const { user } = useAuthStore();

  // Deduplicate communities by ID to prevent React key conflicts
  const uniqueCommunities = joinedCommunities.reduce((acc, community) => {
    if (!acc.find(c => c.id === community.id)) {
      acc.push(community);
    }
    return acc;
  }, [] as typeof joinedCommunities);

  const recentCommunities = uniqueCommunities.slice(0, 6);

  const stats = [
    {
      label: 'Communities Joined',
      value: uniqueCommunities.length,
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400'
    },
    {
      label: 'Messages Today',
      value: 0, // TODO: Implement real stats
      icon: MessageCircle,
      color: 'text-green-600 dark:text-green-400'
    },
    {
      label: 'Upcoming Events',
      value: 0, // TODO: Implement real stats
      icon: Calendar,
      color: 'text-purple-600 dark:text-purple-400'
    },
    {
      label: 'Resources Shared',
      value: 0, // TODO: Implement real stats
      icon: BookOpen,
      color: 'text-orange-600 dark:text-orange-400'
    }
  ];

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Welcome Header */}
        <div className="text-center space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Welcome back, {user?.displayName?.split(' ')[0] || 'Student'}! 👋
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Ready to collaborate and learn with your study communities?
            </p>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap justify-center gap-4 mt-8"
          >
            <button
              onClick={() => openModal('createCommunity')}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              <Plus size={20} />
              <span>Create Community</span>
            </button>
            
            <button
              onClick={() => openModal('discoverCommunities')}
              className="flex items-center space-x-2 px-6 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
            >
              <Search size={20} />
              <span>Discover Communities</span>
            </button>
          </motion.div>
        </div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {stat.label}
                    </p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stat.value}
                    </p>
                  </div>
                  <Icon size={24} className={stat.color} />
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* Recent Communities */}
        {recentCommunities.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-6"
          >
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Your Communities
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentCommunities.map((community) => (
                <CommunityCard
                  key={community.id}
                  community={community}
                />
              ))}
            </div>
          </motion.div>
        )}

        {/* Empty State */}
        {uniqueCommunities.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-center py-12"
          >
            <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <Users size={32} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No communities yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Join or create your first study community to start collaborating with fellow learners.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => openModal('discoverCommunities')}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Discover Communities
              </button>
              <button
                onClick={() => openModal('createCommunity')}
                className="px-6 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
              >
                Create Community
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

interface CommunityCardProps {
  community: any; // TODO: Use proper Community type
}

const CommunityCard: React.FC<CommunityCardProps> = ({ community }) => {
  const { setActiveCommunity } = useCommunityStore();
  const { setActiveCommunity: setUIActiveCommunity } = useUIStore();

  const handleClick = () => {
    setActiveCommunity(community);
    setUIActiveCommunity(community.id);
  };

  const getCommunityColor = (category: string) => {
    const colors = {
      'mathematics': 'bg-blue-600',
      'physics': 'bg-purple-600',
      'chemistry': 'bg-green-600',
      'biology': 'bg-emerald-600',
      'computer-science': 'bg-indigo-600',
      'engineering': 'bg-orange-600',
      'literature': 'bg-pink-600',
      'history': 'bg-yellow-600',
      'other': 'bg-gray-600'
    };
    return colors[category as keyof typeof colors] || colors.other;
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
      className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700 text-left hover:shadow-lg transition-all duration-200"
    >
      <div className="flex items-center space-x-4 mb-4">
        <div className={`w-12 h-12 rounded-lg ${getCommunityColor(community.category)} flex items-center justify-center text-white font-semibold`}>
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
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
            {community.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {community.memberCount} members
          </p>
        </div>
      </div>
      
      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
        {community.description}
      </p>
      
      <div className="mt-4 flex flex-wrap gap-2">
        {community.tags?.slice(0, 3).map((tag: string) => (
          <span
            key={tag}
            className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full"
          >
            {tag}
          </span>
        ))}
      </div>
    </motion.button>
  );
};
