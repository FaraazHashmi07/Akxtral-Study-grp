import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, MessageSquare, Reply } from 'lucide-react';
import { Message } from '../../types';
import { useChatStore } from '../../store/chatStore';
import { MessageItem } from './MessageItem';

interface ThreadedMessagesProps {
  parentMessage: Message;
  communityId: string;
  isAdmin?: boolean;
  onReply?: (message: Message) => void;
  onScrollToMessage?: (messageId: string) => void;
}

export const ThreadedMessages: React.FC<ThreadedMessagesProps> = ({
  parentMessage,
  communityId,
  isAdmin = false,
  onReply,
  onScrollToMessage
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const { messages } = useChatStore();

  const communityMessages = messages[communityId] || [];

  useEffect(() => {
    // Find all messages that are replies to this parent message
    const replies = communityMessages.filter(msg => msg.replyTo === parentMessage.id);
    setThreadMessages(replies);
  }, [communityMessages, parentMessage.id]);

  const handleToggleThread = () => {
    setIsExpanded(!isExpanded);
  };

  const handleReplyToThread = () => {
    if (onReply) {
      onReply(parentMessage);
    }
  };

  if (threadMessages.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 border-l-2 border-blue-200 dark:border-blue-800 pl-4">
      {/* Thread header */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={handleToggleThread}
          className="flex items-center space-x-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          <span>{threadMessages.length} repl{threadMessages.length === 1 ? 'y' : 'ies'}</span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
        
        <button
          onClick={handleReplyToThread}
          className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        >
          <Reply className="w-3 h-3" />
          <span>Reply</span>
        </button>
      </div>

      {/* Thread messages */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            {threadMessages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-3 border border-gray-200 dark:border-gray-700"
              >
                <MessageItem
                  message={message}
                  communityId={communityId}
                  isAdmin={isAdmin}
                  onReply={onReply}
                  onScrollToMessage={onScrollToMessage}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
