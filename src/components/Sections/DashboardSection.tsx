import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Users, MessageCircle, Calendar, FileText, TrendingUp, UserCheck } from 'lucide-react';
import { useCommunityStore } from '../../store/communityStore';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';

export const DashboardSection: React.FC = () => {
  const { activeCommunity } = useCommunityStore();
  const { setActiveSection, showToast, openModal } = useUIStore();
  const { user } = useAuthStore();

  if (!activeCommunity) return null;

  // Check if user is admin
  const isAdmin = user && (
    user.communityRoles?.[activeCommunity.id]?.role === 'community_admin' ||
    user.uid === activeCommunity.createdBy
  );

  if (!activeCommunity) return null;

  // Placeholder data - will be replaced with real analytics
  const stats = [
    {
      label: 'Total Members',
      value: activeCommunity.memberCount || 0,
      change: '+12%',
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400'
    },
    {
      label: 'Messages Today',
      value: 47,
      change: '+23%',
      icon: MessageCircle,
      color: 'text-green-600 dark:text-green-400'
    },
    {
      label: 'Upcoming Events',
      value: 3,
      change: '+1',
      icon: Calendar,
      color: 'text-purple-600 dark:text-purple-400'
    },
    {
      label: 'Resources Shared',
      value: 28,
      change: '+5',
      icon: FileText,
      color: 'text-orange-600 dark:text-orange-400'
    }
  ];

  const recentActivity = [
    {
      id: 1,
      type: 'message',
      user: 'Sarah Chen',
      action: 'posted in #general',
      content: 'Hey everyone! Just uploaded the study notes for Chapter 5.',
      timestamp: '2 minutes ago'
    },
    {
      id: 2,
      type: 'resource',
      user: 'Mike Johnson',
      action: 'uploaded a file',
      content: 'Calculus_Practice_Problems.pdf',
      timestamp: '15 minutes ago'
    },
    {
      id: 3,
      type: 'event',
      user: 'Emma Davis',
      action: 'created an event',
      content: 'Study Session: Linear Algebra Review',
      timestamp: '1 hour ago'
    },
    {
      id: 4,
      type: 'member',
      user: 'Alex Rodriguez',
      action: 'joined the community',
      content: '',
      timestamp: '2 hours ago'
    }
  ];

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {activeCommunity.name} Dashboard
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Community overview and analytics
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <BarChart3 size={24} className="text-blue-600 dark:text-blue-400" />
          </div>
        </div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between mb-4">
                  <Icon size={24} className={stat.color} />
                  <span className="text-sm font-medium text-green-600 dark:text-green-400">
                    {stat.change}
                  </span>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stat.value}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {stat.label}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Recent Activity
              </h2>
            </div>
            <div className="p-6 space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">
                      {activity.user.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900 dark:text-white">
                      <span className="font-medium">{activity.user}</span>{' '}
                      <span className="text-gray-600 dark:text-gray-400">
                        {activity.action}
                      </span>
                    </p>
                    {activity.content && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {activity.content}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {activity.timestamp}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Quick Actions
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <button
                onClick={() => {
                  console.log('📢 [DASHBOARD] Post Announcement clicked');
                  setActiveSection('announcements');
                  showToast({
                    type: 'info',
                    title: 'Announcements',
                    message: 'Switched to announcements section'
                  });
                }}
                className="w-full flex items-center space-x-3 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                <MessageCircle size={20} className="text-blue-600 dark:text-blue-400" />
                <div className="text-left">
                  <p className="font-medium text-gray-900 dark:text-white">
                    Post Announcement
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Share important updates with the community
                  </p>
                </div>
              </button>

              <button
                onClick={() => {
                  console.log('📅 [DASHBOARD] Schedule Event clicked');
                  setActiveSection('calendar');
                  showToast({
                    type: 'info',
                    title: 'Calendar',
                    message: 'Switched to calendar section'
                  });
                }}
                className="w-full flex items-center space-x-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
              >
                <Calendar size={20} className="text-green-600 dark:text-green-400" />
                <div className="text-left">
                  <p className="font-medium text-gray-900 dark:text-white">
                    Schedule Event
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Create a study session or meeting
                  </p>
                </div>
              </button>

              <button
                onClick={() => {
                  console.log('📁 [DASHBOARD] Upload Resource clicked');
                  setActiveSection('resources');
                  showToast({
                    type: 'info',
                    title: 'Resources',
                    message: 'Switched to resources section'
                  });
                }}
                className="w-full flex items-center space-x-3 p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors"
              >
                <FileText size={20} className="text-purple-600 dark:text-purple-400" />
                <div className="text-left">
                  <p className="font-medium text-gray-900 dark:text-white">
                    Upload Resource
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Share study materials and documents
                  </p>
                </div>
              </button>
              
              <button
                onClick={() => {
                  console.log('👥 [DASHBOARD] View Members clicked');
                  openModal('memberList', { communityId: activeCommunity.id });
                }}
                className="w-full flex items-center space-x-3 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors"
              >
                <Users size={20} className="text-orange-600 dark:text-orange-400" />
                <div className="text-left">
                  <p className="font-medium text-gray-900 dark:text-white">
                    View Members
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    View and manage community members
                  </p>
                </div>
              </button>

              {/* Admin-only quick action */}
              {isAdmin && (
                <button
                  onClick={() => {
                    console.log('👥 [DASHBOARD] Manage Join Requests clicked');
                    openModal('joinRequests', {
                      communityId: activeCommunity.id,
                      communityName: activeCommunity.name
                    });
                  }}
                  className="w-full flex items-center space-x-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
                >
                  <UserCheck size={20} className="text-green-600 dark:text-green-400" />
                  <div className="text-left">
                    <p className="font-medium text-gray-900 dark:text-white">
                      Join Requests
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Review and approve community join requests
                    </p>
                  </div>
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
