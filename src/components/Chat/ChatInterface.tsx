import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Smile,
  Paperclip,
  Hash,
  Pin,
  Users,
  HelpCircle,
  X,
  ChevronUp
} from 'lucide-react';
import { format } from 'date-fns';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { useCommunityStore } from '../../store/communityStore';
import { MessageItem } from './MessageItem';
import { TypingIndicator } from './TypingIndicator';
import { ResourceAttachmentModal } from './ResourceAttachmentModal';
import { ThreadSidebar } from './ThreadSidebar';
import { EmojiPickerComponent } from './EmojiPicker';

interface ChatInterfaceProps {
  communityId: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ communityId }) => {
  const { user } = useAuthStore();
  const { activeCommunity, communityMembers } = useCommunityStore();
  const {
    messages,
    pinnedMessages,
    messageInput,
    replyingTo,
    isQuestionMode,
    typingIndicators,
    loading,
    hasMoreMessages,
    activeThread,
    threadSidebarOpen,
    loadMessages,
    loadMoreMessages,
    loadPinnedMessages,
    sendMessage,
    sendQuestionMessage,
    setMessageInput,
    setReplyingTo,
    setQuestionMode,
    startTyping,
    stopTyping,
    clearComposition,
    subscribeToMessages,
    subscribeToTyping,
    unsubscribeFromCommunity
  } = useChatStore();

  const [showResourceModal, setShowResourceModal] = useState(false);
  const [showPinnedMessages, setShowPinnedMessages] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const communityMessages = messages[communityId] || [];
  const communityPinnedMessages = pinnedMessages[communityId] || [];

  // Get user role in this community
  const members = communityMembers[communityId] || [];
  const userMember = members.find(member => member.uid === user?.uid);
  const isAdmin = userMember?.role === 'community_admin';

  useEffect(() => {
    if (communityId) {
      console.log('🔄 [CHAT] Setting up chat for community:', communityId);

      // Load initial data
      loadMessages(communityId);
      loadPinnedMessages(communityId);

      // Subscribe to real-time updates
      subscribeToMessages(communityId);
      subscribeToTyping(communityId);

      return () => {
        console.log('🔌 [CHAT] Cleaning up chat subscriptions for community:', communityId);
        unsubscribeFromCommunity(communityId);
      };
    }
  }, [communityId]);

  useEffect(() => {
    scrollToBottom();
  }, [communityMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = async () => {
    if (!messagesContainerRef.current || isLoadingMore || !hasMoreMessages[communityId]) return;

    const { scrollTop } = messagesContainerRef.current;

    if (scrollTop === 0) {
      setIsLoadingMore(true);
      await loadMoreMessages(communityId);
      setIsLoadingMore(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim()) return;

    // 🚀 PERFORMANCE: Send message (optimistic update handles UI immediately)
    try {
      if (isQuestionMode) {
        sendQuestionMessage(communityId, messageInput, replyingTo?.id); // Don't await - let optimistic update handle UI
      } else {
        sendMessage(communityId, messageInput, replyingTo?.id); // Don't await - let optimistic update handle UI
      }

      inputRef.current?.focus();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessageInput(value);

    // Handle typing indicators
    if (value.trim()) {
      startTyping(communityId);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Set new timeout to stop typing
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(communityId);
      }, 3000);
    } else {
      stopTyping(communityId);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e as any);
    }
  };

  const handleReply = (message: any) => {
    setReplyingTo(message);
    inputRef.current?.focus();
  };

  const handleEmojiSelect = (emoji: string) => {
    console.log('🎭 [EMOJI] Selected emoji:', emoji);

    const textarea = inputRef.current;
    if (textarea) {
      // Get current cursor position, fallback to end of text if not available
      const start = textarea.selectionStart ?? messageInput.length;
      const end = textarea.selectionEnd ?? messageInput.length;
      const currentValue = messageInput;
      const newValue = currentValue.substring(0, start) + emoji + currentValue.substring(end);

      console.log('🎭 [EMOJI] Inserting at position:', start, 'New value:', newValue);

      // Update the input value
      setMessageInput(newValue);

      // Focus and set cursor position after the emoji
      requestAnimationFrame(() => {
        textarea.focus();
        const newCursorPosition = start + emoji.length;
        textarea.setSelectionRange(newCursorPosition, newCursorPosition);
        console.log('🎭 [EMOJI] Cursor set to position:', newCursorPosition);
      });
    } else {
      // Fallback: just append emoji to the end
      console.log('🎭 [EMOJI] No textarea ref, appending to end');
      setMessageInput(messageInput + emoji);
    }
  };

  const currentUserTyping = typingIndicators.filter(indicator =>
    indicator.communityId === communityId
  );

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center space-x-3">
          <Hash className="w-5 h-5 text-gray-500" />
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">
              {activeCommunity?.name || 'Community Chat'}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {communityMessages.length} messages
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Pinned Messages Toggle */}
          {communityPinnedMessages.length > 0 && (
            <button
              onClick={() => setShowPinnedMessages(!showPinnedMessages)}
              className={`p-2 rounded-lg transition-colors ${
                showPinnedMessages
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
              title={`${communityPinnedMessages.length} pinned message${communityPinnedMessages.length !== 1 ? 's' : ''}`}
            >
              <Pin className="w-5 h-5" />
            </button>
          )}

          {/* Members count */}
          <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400">
            <Users className="w-4 h-4" />
            <span className="text-sm">{activeCommunity?.memberCount || 0}</span>
          </div>
        </div>
      </div>
      {/* Pinned Messages */}
      <AnimatePresence>
        {showPinnedMessages && communityPinnedMessages.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-yellow-800 dark:text-yellow-200 flex items-center space-x-2">
                  <Pin className="w-4 h-4" />
                  <span>Pinned Messages</span>
                </h3>
                <button
                  onClick={() => setShowPinnedMessages(false)}
                  className="text-yellow-600 dark:text-yellow-400 hover:text-yellow-800 dark:hover:text-yellow-200"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-2">
                {communityPinnedMessages.map((message) => (
                  <div key={message.id} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-start space-x-2">
                      <img
                        src={message.authorAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(message.authorName)}&background=random`}
                        alt={message.authorName}
                        className="w-6 h-6 rounded-full"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 text-xs text-yellow-700 dark:text-yellow-300">
                          <span className="font-medium">{message.authorName}</span>
                          <span>•</span>
                          <span>{format(message.createdAt, 'MMM d, HH:mm')}</span>
                        </div>
                        <p className="text-sm text-gray-900 dark:text-white mt-1">{message.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages Container */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {/* Load more indicator */}
        {isLoadingMore && (
          <div className="text-center py-2">
            <div className="inline-flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin"></div>
              <span>Loading more messages...</span>
            </div>
          </div>
        )}

        {/* Messages */}
        <AnimatePresence>
          {communityMessages.map((message) => (
            <MessageItem
              key={message.id}
              message={message}
              communityId={communityId}
              isAdmin={isAdmin}
              onReply={handleReply}
            />
          ))}
        </AnimatePresence>

        {/* Typing Indicator */}
        <TypingIndicator
          indicators={currentUserTyping}
          currentUserId={user?.uid || ''}
        />

        <div ref={messagesEndRef} />
      </div>

      {/* Reply indicator */}
      <AnimatePresence>
        {replyingTo && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="px-4 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <span>Replying to</span>
                <span className="font-medium">{replyingTo.authorName}</span>
                <span className="truncate max-w-xs">"{replyingTo.content}"</span>
              </div>
              <button
                onClick={() => setReplyingTo(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <form onSubmit={handleSendMessage} className="space-y-3">
          {/* Question mode toggle */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setQuestionMode(!isQuestionMode)}
              className={`flex items-center space-x-2 px-3 py-1 rounded-lg text-sm transition-colors ${
                isQuestionMode
                  ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <HelpCircle className="w-4 h-4" />
              <span>{isQuestionMode ? 'Question Mode' : 'Ask Question'}</span>
            </button>
          </div>

          <div className="flex items-end space-x-3">
            <div className="flex-1">
              <div className="relative">
                <textarea
                  ref={inputRef}
                  value={messageInput}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyPress}
                  placeholder={isQuestionMode ? "Ask a question..." : "Type a message..."}
                  className="w-full px-4 py-3 pr-20 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                  rows={1}
                  style={{ minHeight: '44px', maxHeight: '120px' }}
                />
                <div className="absolute right-2 bottom-2 flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => setShowResourceModal(true)}
                    className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded"
                    title="Attach resource"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className={`p-1 rounded transition-colors ${
                        showEmojiPicker
                          ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                          : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                      }`}
                      title="Add emoji"
                    >
                      <Smile className="w-4 h-4" />
                    </button>
                    <EmojiPickerComponent
                      isOpen={showEmojiPicker}
                      onClose={() => setShowEmojiPicker(false)}
                      onEmojiSelect={handleEmojiSelect}
                    />
                  </div>
                </div>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="submit"
              disabled={!messageInput.trim()}
              className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </motion.button>
          </div>
        </form>
      </div>

      {/* Resource Attachment Modal */}
      <ResourceAttachmentModal
        isOpen={showResourceModal}
        onClose={() => setShowResourceModal(false)}
        communityId={communityId}
      />

      {/* Thread Sidebar */}
      {activeThread && (
        <ThreadSidebar
          isOpen={threadSidebarOpen}
          messageId={activeThread}
          originalMessage={communityMessages.find(m => m.id === activeThread)}
          communityId={communityId}
        />
      )}
    </div>
  );
};