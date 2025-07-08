import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Hash } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';

export const ChatSection: React.FC = () => {
  const { activeChannel } = useChatStore();

  return (
    <div className="h-full flex flex-col bg-white dark:bg-gray-900">
      {activeChannel ? (
        <>
          {/* Channel Header */}
          <div className="h-16 border-b border-gray-200 dark:border-gray-700 flex items-center px-6">
            <Hash size={20} className="text-gray-500 dark:text-gray-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {activeChannel.name}
            </h2>
            {activeChannel.description && (
              <span className="ml-3 text-sm text-gray-500 dark:text-gray-400">
                {activeChannel.description}
              </span>
            )}
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="text-center py-12">
              <MessageCircle size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Welcome to #{activeChannel.name}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                This is the beginning of the #{activeChannel.name} channel.
              </p>
            </div>
          </div>

          {/* Message Input */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center space-x-3">
              <input
                type="text"
                placeholder={`Message #${activeChannel.name}`}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-white"
              />
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
                Send
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <MessageCircle size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Select a channel
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Choose a channel from the sidebar to start chatting.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
