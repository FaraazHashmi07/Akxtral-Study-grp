import React from 'react';
import { motion } from 'framer-motion';
import { 
  MessageSquare, 
  Calendar, 
  Database, 
  BookOpen,
  Bookmark,
  Users,
  Clock,
  TrendingUp,
  Star,
  ChevronRight
} from 'lucide-react';
import { useAppStore } from '../../store/appStore';

const quickAccessTiles = [
  { title: 'Chat', icon: MessageSquare, color: 'bg-blue-500', description: 'Join conversations' },
  { title: 'Calendar', icon: Calendar, color: 'bg-green-500', description: 'Upcoming events' },
  { title: 'Database', icon: Database, color: 'bg-purple-500', description: 'Study resources' },
  { title: 'Resources', icon: BookOpen, color: 'bg-orange-500', description: 'Learning materials' },
  { title: 'Bookmarks', icon: Bookmark, color: 'bg-pink-500', description: 'Saved items' }
];

const recentActivity = [
  { id: 1, type: 'message', content: 'New message in React Study Group', time: '2 min ago', unread: true },
  { id: 2, type: 'resource', content: 'JavaScript Fundamentals.pdf was shared', time: '1 hour ago', unread: true },
  { id: 3, type: 'event', content: 'Weekly Code Review starts in 30 minutes', time: '2 hours ago', unread: false },
  { id: 4, type: 'announcement', content: 'New study materials available', time: '1 day ago', unread: false }
];

const recentlyViewed = [
  { title: 'React Hooks Guide', type: 'PDF', time: '10 min ago' },
  { title: 'Algorithm Complexity', type: 'Video', time: '1 hour ago' },
  { title: 'Database Design', type: 'Article', time: '2 hours ago' },
  { title: 'CSS Grid Tutorial', type: 'PDF', time: '1 day ago' }
];

export const MemberDashboard: React.FC = () => {
  const { groups, setCurrentView } = useAppStore();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Welcome back!</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Ready to continue your learning journey?
        </p>
      </div>

      {/* Quick Access Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {quickAccessTiles.map((tile, index) => (
          <motion.button
            key={tile.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setCurrentView(tile.title.toLowerCase())}
            className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-all"
          >
            <div className={`w-12 h-12 ${tile.color} rounded-lg flex items-center justify-center mb-3 mx-auto`}>
              <tile.icon className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
              {tile.title}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {tile.description}
            </p>
          </motion.button>
        ))}
      </div>

      {/* Groups & Communities */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Your Study Groups
          </h2>
          <button className="text-blue-600 dark:text-blue-400 text-sm font-medium hover:underline">
            View all
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((group, index) => (
            <motion.div
              key={group.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 ${group.color} rounded-lg flex items-center justify-center`}>
                    <span className="text-white text-lg">{group.icon}</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {group.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {group.memberCount} members
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {group.unreadCount > 0 && (
                    <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                      {group.unreadCount}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mt-3">
                {group.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Activity
            </h3>
            <Clock className="w-5 h-5 text-gray-500" />
          </div>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  activity.unread ? 'bg-blue-500' : 'bg-gray-300'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${
                    activity.unread 
                      ? 'text-gray-900 dark:text-white font-medium' 
                      : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {activity.content}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {activity.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Recently Viewed */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recently Viewed
            </h3>
            <Star className="w-5 h-5 text-gray-500" />
          </div>
          <div className="space-y-3">
            {recentlyViewed.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors cursor-pointer">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">
                      {item.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {item.type} • {item.time}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Tip of the Day */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800"
      >
        <div className="flex items-start space-x-4">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              💡 Tip of the Day
            </h3>
            <p className="text-gray-700 dark:text-gray-300 text-sm">
              Use the global search (⌘K) to quickly find messages, resources, and events across all your study groups. 
              It's the fastest way to locate what you're looking for!
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};