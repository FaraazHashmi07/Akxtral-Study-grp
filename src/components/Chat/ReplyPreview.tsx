import React from 'react';
import { motion } from 'framer-motion';
import { Reply } from 'lucide-react';

interface ReplyPreviewProps {
  replyToSenderName: string;
  replyToMessageSnippet: string;
  onClick?: () => void;
}

export const ReplyPreview: React.FC<ReplyPreviewProps> = ({
  replyToSenderName,
  replyToMessageSnippet,
  onClick
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        flex items-start space-x-2 px-3 py-2 mb-2 
        bg-gray-50 dark:bg-gray-800/50 
        border-l-4 border-blue-500 
        rounded-r-lg
        ${onClick ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors' : ''}
      `}
      onClick={onClick}
    >
      {/* Reply Icon */}
      <Reply className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
      
      {/* Reply Content */}
      <div className="flex-1 min-w-0">
        {/* Original Sender Name */}
        <div className="flex items-center space-x-1 mb-1">
          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
            @{replyToSenderName}
          </span>
        </div>
        
        {/* Original Message Snippet */}
        <div className="text-sm text-gray-600 dark:text-gray-400 truncate">
          {replyToMessageSnippet}
        </div>
      </div>
    </motion.div>
  );
};
