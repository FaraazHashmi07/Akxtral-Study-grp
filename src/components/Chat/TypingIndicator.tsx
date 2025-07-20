import React from 'react';
import { motion } from 'framer-motion';
import { TypingIndicator as TypingIndicatorType } from '../../types';

interface TypingIndicatorProps {
  indicators: TypingIndicatorType[];
  currentUserId: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  indicators,
  currentUserId
}) => {
  // Filter out current user's typing indicator
  const otherUsersTyping = indicators.filter(indicator => indicator.userId !== currentUserId);

  if (otherUsersTyping.length === 0) {
    return null;
  }

  const getTypingText = () => {
    const names = otherUsersTyping.map(indicator => indicator.userName);
    
    if (names.length === 1) {
      return `${names[0]} is typing...`;
    } else if (names.length === 2) {
      return `${names[0]} and ${names[1]} are typing...`;
    } else {
      return `${names[0]} and ${names.length - 1} others are typing...`;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center space-x-3 px-4 py-2"
    >
      <div className="flex space-x-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.2
            }}
          />
        ))}
      </div>
      <span className="text-sm text-gray-500 dark:text-gray-400 italic">
        {getTypingText()}
      </span>
    </motion.div>
  );
};
