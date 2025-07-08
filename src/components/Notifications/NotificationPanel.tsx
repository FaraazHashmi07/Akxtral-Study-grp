import React from 'react';
import { motion } from 'framer-motion';
import { X, MessageSquare, Calendar, FileText, Megaphone, Check, Bell, Users } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { Notification } from '../../types';

const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'message':
      return MessageSquare;
    case 'event':
      return Calendar;
    case 'resource':
      return FileText;
    case 'announcement':
      return Megaphone;
    case 'community':
      return Users;
    case 'join_request':
      return Users;
    default:
      return Bell;
  }
};

const formatTimestamp = (timestamp: Date) => {
  const now = new Date();
  const diff = now.getTime() - timestamp.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
};

export const NotificationPanel: React.FC = () => {
  const {
    notifications,
    unreadNotificationCount,
    markNotificationRead,
    markAllNotificationsRead,
    removeNotification,
    setNotificationPanelOpen
  } = useUIStore();

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.isRead) {
      markNotificationRead(notification.id);
    }

    // Navigate to the related content if actionUrl is provided
    if (notification.actionUrl) {
      // TODO: Implement navigation logic
      console.log('Navigate to:', notification.actionUrl);
    }
  };

  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      onClick={(e) => e.stopPropagation()}
      className="w-96 h-full bg-white dark:bg-gray-800 shadow-xl border-l border-gray-200 dark:border-gray-700 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-2">
          <Bell className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Notifications
          </h2>
          {unreadNotificationCount > 0 && (
            <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 text-xs font-medium rounded-full">
              {unreadNotificationCount}
            </span>
          )}
        </div>
        <button
          onClick={() => setNotificationPanelOpen(false)}
          className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Actions */}
      {unreadNotificationCount > 0 && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={markAllNotificationsRead}
            className="w-full px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            Mark all read
          </button>
        </div>
      )}

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No notifications yet</p>
            <p className="text-sm mt-1">We'll notify you when something happens</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {notifications.map((notification) => {
              const Icon = getNotificationIcon(notification.type);
              return (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer group ${
                    !notification.isRead ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      notification.type === 'message' ? 'bg-blue-100 dark:bg-blue-900' :
                      notification.type === 'event' ? 'bg-green-100 dark:bg-green-900' :
                      notification.type === 'resource' ? 'bg-purple-100 dark:bg-purple-900' :
                      notification.type === 'community' ? 'bg-green-100 dark:bg-green-900' :
                      notification.type === 'join_request' ? 'bg-blue-100 dark:bg-blue-900' :
                      'bg-orange-100 dark:bg-orange-900'
                    }`}>
                      <Icon className={`w-4 h-4 ${
                        notification.type === 'message' ? 'text-blue-600 dark:text-blue-400' :
                        notification.type === 'event' ? 'text-green-600 dark:text-green-400' :
                        notification.type === 'resource' ? 'text-purple-600 dark:text-purple-400' :
                        notification.type === 'community' ? 'text-green-600 dark:text-green-400' :
                        notification.type === 'join_request' ? 'text-blue-600 dark:text-blue-400' :
                        'text-orange-600 dark:text-orange-400'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <p className={`text-sm font-medium ${
                          !notification.isRead
                            ? 'text-gray-900 dark:text-white'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {notification.title}
                        </p>
                        <div className="flex items-center space-x-2">
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeNotification(notification.id);
                            }}
                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        {notification.content}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                        {formatTimestamp(notification.timestamp)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
};