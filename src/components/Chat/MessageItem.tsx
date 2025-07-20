import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Reply,
  MoreVertical,
  Pin,
  Edit3,
  Trash2,
  MessageSquare,
  HelpCircle,
  FileText,
  Download,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { Message } from '../../types';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { useCommunityStore } from '../../store/communityStore';
import { ThreadIndicator } from './ThreadIndicator';
import { ReplyPreview } from './ReplyPreview';
import { EmojiText } from './EmojiText';
import { MessageReactions } from './MessageReactions';

interface MessageItemProps {
  message: Message;
  communityId: string;
  isAdmin?: boolean;
  onReply?: (message: Message) => void;
}

const quickReactions = ['👍', '❤️', '😂', '😮', '🤔', '👏'];

export const MessageItem: React.FC<MessageItemProps> = React.memo(({
  message,
  communityId,
  isAdmin = false,
  onReply
}) => {
  const { user } = useAuthStore();
  const { toggleReaction, togglePinMessage, deleteMessage, openThread } = useChatStore();
  const [showActions, setShowActions] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const isOwner = user?.uid === message.authorId;
  const canPin = isAdmin;
  const canDelete = isOwner || isAdmin;

  const handleReaction = (emoji: string) => {
    toggleReaction(message.id, emoji);
  };

  const handlePin = () => {
    if (canPin) {
      togglePinMessage(message.id);
    }
    setShowMenu(false);
  };

  const handleDelete = () => {
    if (canDelete && window.confirm('Are you sure you want to delete this message?')) {
      deleteMessage(message.id);
    }
    setShowMenu(false);
  };

  const handleReply = () => {
    if (onReply) {
      onReply(message);
    }
    setShowMenu(false);
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
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-gray-900 dark:text-white truncate">
                      {message.resourceAttachment.resourceName}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Uploaded by {message.resourceAttachment.uploadedByName}
                    </p>
                    <div className="flex items-center space-x-3 mt-2">
                      <button
                        onClick={() => window.open(message.resourceAttachment!.resourceUrl, '_blank')}
                        className="flex items-center space-x-1 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View</span>
                      </button>
                      <button
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = message.resourceAttachment!.resourceUrl;
                          link.download = message.resourceAttachment!.resourceName;
                          link.click();
                        }}
                        className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      
      case 'question':
        return (
          <div className="space-y-3">
            <div className="flex items-start space-x-2">
              <HelpCircle className="w-5 h-5 text-orange-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 border border-orange-200 dark:border-orange-800">
                  <EmojiText
                    content={message.content}
                    className="text-gray-900 dark:text-white text-sm leading-relaxed font-medium"
                  />
                </div>
              </div>
            </div>
            {/* TODO: Implement QuestionAnswers component */}
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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group relative ${
        message.isPinned 
          ? 'bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-800' 
          : ''
      }`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Pinned indicator */}
      {message.isPinned && (
        <div className="flex items-center space-x-2 mb-2 text-yellow-600 dark:text-yellow-400">
          <Pin className="w-4 h-4" />
          <span className="text-xs font-medium">Pinned Message</span>
        </div>
      )}

      {/* Reply Preview */}
      {message.replyToSenderName && message.replyToMessageSnippet && (
        <ReplyPreview
          replyToSenderName={message.replyToSenderName}
          replyToMessageSnippet={message.replyToMessageSnippet}
          onClick={() => {
            // TODO: Scroll to original message (optional feature)
            console.log('Clicked reply preview for message:', message.replyToMessageId);
          }}
        />
      )}

      <div className="flex items-start space-x-3">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <img
            src={message.authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(message.authorName)}&background=random`}
            alt={message.authorName}
            className="w-10 h-10 rounded-full object-cover"
          />
        </div>

        {/* Message content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center space-x-2 mb-1">
            <span className="font-medium text-gray-900 dark:text-white">
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
            <MessageReactions
              reactions={message.reactions}
              onReaction={handleReaction}
              currentUserId={user?.uid || ''}
            />
          )}

          {/* Thread Indicator */}
          <ThreadIndicator
            message={message}
            onClick={() => openThread(message.id)}
          />
        </div>

        {/* Message Actions */}
        {showActions && (
          <div className="flex items-center space-x-1">
            {/* Quick reactions */}
            <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
              {quickReactions.slice(0, 3).map((emoji) => (
                <motion.button
                  key={emoji}
                  whileHover={{ scale: 1.2 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleReaction(emoji)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  <span className="text-sm">{emoji}</span>
                </motion.button>
              ))}
              <button 
                onClick={handleReply}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <Reply className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* More actions menu */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                <MoreVertical className="w-4 h-4 text-gray-500" />
              </button>

              {showMenu && (
                <div className="absolute right-0 top-8 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-10 min-w-[140px]">
                  <button
                    onClick={() => {
                      openThread(message.id);
                      setShowMenu(false);
                    }}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span>Start Thread</span>
                  </button>
                  {canPin && (
                    <button
                      onClick={handlePin}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                    >
                      <Pin className="w-4 h-4" />
                      <span>{message.isPinned ? 'Unpin' : 'Pin'}</span>
                    </button>
                  )}
                  {isOwner && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                    >
                      <Edit3 className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={handleDelete}
                      className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
});
