import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MoreVertical, Edit3, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ThreadMessage as ThreadMessageType } from '../../types';
import { MessageReactions } from './MessageReactions';
import { EmojiText } from './EmojiText';
import { useChatStore } from '../../store/chatStore';

interface ThreadMessageProps {
  message: ThreadMessageType;
  currentUserId: string;
}

const quickReactions = ['👍', '❤️', '😂', '😮', '🤔', '👏'];

export const ThreadMessage: React.FC<ThreadMessageProps> = React.memo(({
  message,
  currentUserId
}) => {
  const { toggleThreadReaction } = useChatStore();
  const [showActions, setShowActions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const isOwner = currentUserId === message.authorId;

  const handleReaction = (emoji: string) => {
    console.log('😊 [THREAD-UI] Reacting to thread message:', message.id, emoji);
    toggleThreadReaction(message.parentMessageId, message.id, emoji);
  };

  const renderMessageContent = () => {
    switch (message.type) {
      case 'resource':
        return (
          <div className="space-y-2">
            <EmojiText
              content={message.content}
              className="text-gray-900 dark:text-white text-sm leading-relaxed"
            />
            {message.resourceAttachment && (
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 dark:text-blue-400 text-xs">📎</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-white truncate text-sm">
                      {message.resourceAttachment.resourceName}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      Uploaded by {message.resourceAttachment.uploadedByName}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      
      default:
        return (
          <EmojiText
            content={message.content}
            className="text-gray-900 dark:text-white text-sm leading-relaxed"
          />
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="flex items-start space-x-3">
        {/* Avatar */}
        <img
          src={message.authorAvatar || `https://ui-avatars.com/api/?name=${message.authorName}&background=6366f1&color=fff`}
          alt={message.authorName}
          className="w-8 h-8 rounded-full flex-shrink-0"
        />

        {/* Message content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-medium text-gray-900 dark:text-white text-sm">
              {message.authorName}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {format(message.createdAt, 'HH:mm')}
            </span>
            {message.editedAt && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                (edited)
              </span>
            )}
          </div>

          {/* Content */}
          {renderMessageContent()}

          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="mt-2">
              <MessageReactions 
                reactions={message.reactions}
                onReaction={handleReaction}
                currentUserId={currentUserId}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className={`flex items-center space-x-1 transition-opacity ${
          showActions ? 'opacity-100' : 'opacity-0'
        }`}>
          {/* Quick reactions */}
          <div className="flex items-center space-x-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 px-2 py-1">
            {quickReactions.slice(0, 3).map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className="text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-1 py-0.5 transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* More actions */}
          {isOwner && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              >
                <MoreVertical className="w-4 h-4 text-gray-500" />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-8 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10 min-w-[120px]">
                  <button
                    onClick={() => {
                      // TODO: Implement edit
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                  >
                    <Edit3 className="w-4 h-4" />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => {
                      // TODO: Implement delete
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
});
