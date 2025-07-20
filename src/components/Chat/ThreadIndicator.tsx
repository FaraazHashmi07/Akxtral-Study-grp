import React from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, ChevronRight } from 'lucide-react';
import { Message } from '../../types';

interface ThreadIndicatorProps {
  message: Message;
  onClick: () => void;
}

export const ThreadIndicator: React.FC<ThreadIndicatorProps> = ({ 
  message, 
  onClick 
}) => {
  const threadCount = message.threadCount || 0;
  const threadName = message.threadName;

  if (!message.hasThread || threadCount === 0) {
    return null;
  }

  return (
    <motion.button
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="mt-2 flex items-center space-x-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors group"
    >
      <MessageCircle className="w-4 h-4 text-blue-600 dark:text-blue-400" />
      <div className="flex-1 text-left">
        {threadName && (
          <div className="text-sm font-medium text-blue-900 dark:text-blue-100 truncate">
            {threadName}
          </div>
        )}
        <div className="text-xs text-blue-700 dark:text-blue-300">
          {threadCount} {threadCount === 1 ? 'message' : 'messages'} in thread
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform" />
    </motion.button>
  );
};
