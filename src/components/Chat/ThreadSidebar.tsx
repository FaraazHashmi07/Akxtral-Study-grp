import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Hash, MessageCircle, Smile } from 'lucide-react';
import { format } from 'date-fns';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { ThreadMessage } from './ThreadMessage';
import { EmojiPickerComponent } from './EmojiPicker';

interface ThreadSidebarProps {
  isOpen: boolean;
  messageId: string;
  originalMessage: any;
  communityId: string;
}

export const ThreadSidebar: React.FC<ThreadSidebarProps> = ({
  isOpen,
  messageId,
  originalMessage,
  communityId
}) => {
  const { user } = useAuthStore();
  const {
    threadMessages,
    threads,
    threadInput,
    threadName,
    closeThread,
    createThread,
    loadThreadMessages,
    sendThreadMessage,
    subscribeToThread,
    unsubscribeFromThread,
    setThreadInput,
    setThreadName
  } = useChatStore();

  const [isCreatingThread, setIsCreatingThread] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentThreadMessages = threadMessages[messageId] || [];
  const currentThread = threads[messageId];
  const hasExistingThread = originalMessage?.hasThread;

  // Detect dark mode
  const isDarkMode = document.documentElement.classList.contains('dark');

  useEffect(() => {
    if (isOpen && messageId) {
      if (hasExistingThread) {
        loadThreadMessages(messageId);
        subscribeToThread(messageId);
      } else {
        setIsCreatingThread(true);
      }
    }

    return () => {
      if (messageId) {
        unsubscribeFromThread(messageId);
      }
    };
  }, [isOpen, messageId, hasExistingThread]);

  useEffect(() => {
    // 🚀 PERFORMANCE: Smooth scroll with requestAnimationFrame
    requestAnimationFrame(() => {
      scrollToBottom();
    });
  }, [currentThreadMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCreateThread = async () => {
    if (!threadInput.trim()) return;

    // 🚀 PERFORMANCE: Create thread with optimistic updates
    try {
      createThread(communityId, messageId, threadName || undefined, threadInput); // Don't await
      setIsCreatingThread(false);
      inputRef.current?.focus();
    } catch (error) {
      console.error('Failed to create thread:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!threadInput.trim()) return;

    // 🚀 PERFORMANCE: Send message (optimistic update handles UI immediately)
    try {
      sendThreadMessage(messageId, threadInput); // Don't await - let optimistic update handle UI
      inputRef.current?.focus();
    } catch (error) {
      console.error('Failed to send thread message:', error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isCreatingThread) {
        handleCreateThread();
      } else {
        handleSendMessage();
      }
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    console.log('🎭 [THREAD-EMOJI] Selected emoji:', emoji);

    const textarea = inputRef.current;
    if (textarea) {
      // Get current cursor position, fallback to end of text if not available
      const start = textarea.selectionStart ?? threadInput.length;
      const end = textarea.selectionEnd ?? threadInput.length;
      const currentValue = threadInput;
      const newValue = currentValue.substring(0, start) + emoji + currentValue.substring(end);

      console.log('🎭 [THREAD-EMOJI] Inserting at position:', start, 'New value:', newValue);

      // Update the input value
      setThreadInput(newValue);

      // Focus and set cursor position after the emoji
      requestAnimationFrame(() => {
        textarea.focus();
        const newCursorPosition = start + emoji.length;
        textarea.setSelectionRange(newCursorPosition, newCursorPosition);
        console.log('🎭 [THREAD-EMOJI] Cursor set to position:', newCursorPosition);
      });
    } else {
      // Fallback: just append emoji to the end
      console.log('🎭 [THREAD-EMOJI] No textarea ref, appending to end');
      setThreadInput(threadInput + emoji);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          exit={{ x: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700 shadow-xl z-50 flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2">
              <Hash className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {isCreatingThread ? 'New Thread' : (currentThread?.name || 'Thread')}
              </h2>
            </div>
            <button
              onClick={closeThread}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Original Message */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-start space-x-3">
              <img
                src={originalMessage?.authorAvatar || `https://ui-avatars.com/api/?name=${originalMessage?.authorName}&background=6366f1&color=fff`}
                alt={originalMessage?.authorName}
                className="w-8 h-8 rounded-full"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="font-medium text-gray-900 dark:text-white text-sm">
                    {originalMessage?.authorName}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {originalMessage?.createdAt && format(originalMessage.createdAt, 'MMM d, HH:mm')}
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                  {originalMessage?.content}
                </p>
              </div>
            </div>
          </div>

          {/* Thread Name Input (for new threads) */}
          {isCreatingThread && (
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Thread Name (Optional)
              </label>
              <input
                type="text"
                value={threadName}
                onChange={(e) => setThreadName(e.target.value)}
                placeholder="e.g., Homework Help, Assignment Discussion..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-sm"
              />
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!isCreatingThread && currentThreadMessages.length === 0 && (
              <div className="text-center py-8">
                <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  No messages in this thread yet.
                </p>
              </div>
            )}

            {!isCreatingThread && currentThreadMessages.map((message) => (
              <ThreadMessage
                key={message.id}
                message={message}
                currentUserId={user?.uid || ''}
              />
            ))}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-end space-x-3">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={threadInput}
                  onChange={(e) => setThreadInput(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder={isCreatingThread ? "Start the thread..." : "Reply to thread..."}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none text-sm"
                  rows={2}
                />
                <div className="absolute right-2 bottom-2">
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
                    isDarkMode={isDarkMode}
                  />
                </div>
              </div>
              <button
                onClick={isCreatingThread ? handleCreateThread : handleSendMessage}
                disabled={!threadInput.trim()}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Press Enter to {isCreatingThread ? 'create thread' : 'send'} • Shift+Enter for new line
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
