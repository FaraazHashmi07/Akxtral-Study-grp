import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, 
  Smile, 
  Paperclip, 
  MoreVertical,
  Reply,
  Heart,
  ThumbsUp,
  Laugh,
  MessageSquare,
  Pin,
  Users
} from 'lucide-react';
import { format } from 'date-fns';

interface Message {
  id: string;
  content: string;
  author: {
    name: string;
    avatar: string;
    isOnline: boolean;
  };
  timestamp: Date;
  reactions: { emoji: string; count: number; hasReacted: boolean }[];
  isAnnouncement?: boolean;
  threadCount?: number;
}

const mockMessages: Message[] = [
  {
    id: '1',
    content: '🎉 Welcome to the React Study Group! This is where we discuss React concepts, share resources, and help each other learn.',
    author: {
      name: 'Alex Johnson',
      avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      isOnline: true
    },
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    reactions: [
      { emoji: '👍', count: 5, hasReacted: false },
      { emoji: '🎉', count: 3, hasReacted: true }
    ],
    isAnnouncement: true
  },
  {
    id: '2',
    content: 'Hey everyone! I\'m working on a React project and struggling with useEffect. Can someone help me understand when to use the dependency array?',
    author: {
      name: 'Sarah Chen',
      avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      isOnline: true
    },
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    reactions: [
      { emoji: '👍', count: 2, hasReacted: false }
    ],
    threadCount: 4
  },
  {
    id: '3',
    content: 'Great question! The dependency array in useEffect determines when the effect should re-run. If you pass an empty array [], it runs only once after the initial render.',
    author: {
      name: 'Mike Rodriguez',
      avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
      isOnline: false
    },
    timestamp: new Date(Date.now() - 25 * 60 * 1000),
    reactions: [
      { emoji: '👍', count: 3, hasReacted: true },
      { emoji: '❤️', count: 1, hasReacted: false }
    ]
  }
];

const quickReactions = ['👍', '❤️', '😂', '😮', '😢', '😡'];

export const ChatInterface: React.FC = () => {
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [messages, setMessages] = useState(mockMessages);
  const [typingUsers] = useState(['Emma Wilson']);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: message,
      author: {
        name: 'You',
        avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=2',
        isOnline: true
      },
      timestamp: new Date(),
      reactions: []
    };

    setMessages([...messages, newMessage]);
    setMessage('');
  };

  const handleReaction = (messageId: string, emoji: string) => {
    setMessages(messages.map(msg => {
      if (msg.id === messageId) {
        const existingReaction = msg.reactions.find(r => r.emoji === emoji);
        if (existingReaction) {
          return {
            ...msg,
            reactions: msg.reactions.map(r => 
              r.emoji === emoji 
                ? { ...r, count: r.hasReacted ? r.count - 1 : r.count + 1, hasReacted: !r.hasReacted }
                : r
            ).filter(r => r.count > 0)
          };
        } else {
          return {
            ...msg,
            reactions: [...msg.reactions, { emoji, count: 1, hasReacted: true }]
          };
        }
      }
      return msg;
    }));
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
            <span className="text-white text-lg">⚛️</span>
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">React Study Group</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
              <Users className="w-4 h-4" />
              <span>24 members</span>
              <span>•</span>
              <span>12 online</span>
            </div>
          </div>
        </div>
        <button className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
          <MoreVertical className="w-5 h-5" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`group ${msg.isAnnouncement ? 'bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800' : ''}`}
            >
              <div className="flex items-start space-x-3">
                <div className="relative">
                  <img
                    src={msg.author.avatar}
                    alt={msg.author.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  {msg.author.isOnline && (
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="font-medium text-gray-900 dark:text-white">
                      {msg.author.name}
                    </span>
                    {msg.isAnnouncement && (
                      <span className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs px-2 py-1 rounded-full">
                        Announcement
                      </span>
                    )}
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {format(msg.timestamp, 'HH:mm')}
                    </span>
                  </div>
                  <p className="text-gray-900 dark:text-white text-sm leading-relaxed">
                    {msg.content}
                  </p>
                  
                  {/* Reactions */}
                  {msg.reactions.length > 0 && (
                    <div className="flex items-center space-x-1 mt-2">
                      {msg.reactions.map((reaction) => (
                        <motion.button
                          key={reaction.emoji}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleReaction(msg.id, reaction.emoji)}
                          className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs ${
                            reaction.hasReacted
                              ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                        >
                          <span>{reaction.emoji}</span>
                          <span>{reaction.count}</span>
                        </motion.button>
                      ))}
                    </div>
                  )}

                  {/* Thread indicator */}
                  {msg.threadCount && (
                    <button className="flex items-center space-x-1 mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline">
                      <MessageSquare className="w-3 h-3" />
                      <span>{msg.threadCount} replies</span>
                    </button>
                  )}
                </div>

                {/* Message Actions */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                  <div className="flex items-center bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                    {quickReactions.slice(0, 3).map((emoji) => (
                      <motion.button
                        key={emoji}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleReaction(msg.id, emoji)}
                        className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                      >
                        <span className="text-sm">{emoji}</span>
                      </motion.button>
                    ))}
                    <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                      <Reply className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400"
          >
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
            <span>{typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...</span>
          </motion.div>
        )}
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <form onSubmit={handleSendMessage} className="flex items-end space-x-3">
          <div className="flex-1">
            <div className="relative">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="w-full px-4 py-3 pr-12 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white resize-none"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
              />
              <div className="absolute right-2 bottom-2 flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded"
                >
                  <Smile className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded"
                >
                  <Paperclip className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            disabled={!message.trim()}
            className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </motion.button>
        </form>
      </div>
    </div>
  );
};