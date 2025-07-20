import React from 'react';
import { motion } from 'framer-motion';
import { MessageReaction } from '../../types';

interface MessageReactionsProps {
  reactions: MessageReaction[];
  onReaction: (emoji: string) => void;
  currentUserId: string;
}

export const MessageReactions: React.FC<MessageReactionsProps> = ({
  reactions,
  onReaction,
  currentUserId
}) => {
  if (!reactions || reactions.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center space-x-1 mt-2">
      {reactions.map((reaction) => {
        const hasReacted = reaction.users.includes(currentUserId);
        
        return (
          <motion.button
            key={reaction.emoji}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onReaction(reaction.emoji)}
            className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs transition-colors ${
              hasReacted
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
            }`}
            title={`${reaction.users.length} reaction${reaction.users.length !== 1 ? 's' : ''}`}
          >
            <span>{reaction.emoji}</span>
            <span className="font-medium">{reaction.count}</span>
          </motion.button>
        );
      })}
    </div>
  );
};
