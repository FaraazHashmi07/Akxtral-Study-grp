import { create } from 'zustand';
import { 
  ChatChannel, 
  Message, 
  MessageAttachment, 
  MessageReaction,
  TypingIndicator 
} from '../types';

interface ChatState {
  // State
  channels: Record<string, ChatChannel[]>; // communityId -> channels
  activeChannel: ChatChannel | null;
  messages: Record<string, Message[]>; // channelId -> messages
  typingIndicators: TypingIndicator[];
  loading: boolean;
  error: string | null;
  
  // Message composition
  messageInput: string;
  replyingTo: Message | null;
  uploadingFiles: File[];
  
  // Actions
  loadChannels: (communityId: string) => Promise<void>;
  setActiveChannel: (channel: ChatChannel | null) => void;
  createChannel: (communityId: string, data: Partial<ChatChannel>) => Promise<ChatChannel>;
  updateChannel: (channelId: string, updates: Partial<ChatChannel>) => Promise<void>;
  deleteChannel: (channelId: string) => Promise<void>;
  
  // Messages
  loadMessages: (channelId: string, limit?: number, before?: string) => Promise<void>;
  sendMessage: (channelId: string, content: string, attachments?: File[], replyTo?: string) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  
  // Reactions
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  removeReaction: (messageId: string, emoji: string) => Promise<void>;
  
  // Typing indicators
  startTyping: (channelId: string) => void;
  stopTyping: (channelId: string) => void;
  
  // Message composition
  setMessageInput: (input: string) => void;
  setReplyingTo: (message: Message | null) => void;
  addUploadingFile: (file: File) => void;
  removeUploadingFile: (index: number) => void;
  clearComposition: () => void;
  
  // Real-time subscriptions
  subscribeToChannel: (channelId: string) => () => void;
  subscribeToTyping: (channelId: string) => () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  channels: {},
  activeChannel: null,
  messages: {},
  typingIndicators: [],
  loading: false,
  error: null,
  messageInput: '',
  replyingTo: null,
  uploadingFiles: [],

  // Load channels for a community
  loadChannels: async (communityId) => {
    set({ loading: true, error: null });
    try {
      // TODO: Implement Firestore query for community channels
      // const channels = await getCommunityChannels(communityId);
      const channels: ChatChannel[] = [
        {
          id: 'general',
          communityId,
          name: 'general',
          description: 'General discussion',
          type: 'text',
          position: 0,
          createdBy: 'system',
          createdAt: new Date(),
          permissions: {
            viewChannel: ['community_admin', 'community_member'],
            sendMessages: ['community_admin', 'community_member'],
            manageMessages: ['community_admin']
          }
        }
      ]; // Placeholder with default general channel
      
      const { channels: currentChannels } = get();
      set({
        channels: {
          ...currentChannels,
          [communityId]: channels
        },
        loading: false
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load channels',
        loading: false 
      });
    }
  },

  // Set the currently active channel
  setActiveChannel: (channel) => {
    set({ activeChannel: channel });
    if (channel) {
      // Load messages when a channel is selected
      get().loadMessages(channel.id);
      // Subscribe to real-time updates
      get().subscribeToChannel(channel.id);
      get().subscribeToTyping(channel.id);
    }
  },

  // Create a new channel (admin only)
  createChannel: async (communityId, data) => {
    set({ loading: true, error: null });
    try {
      // TODO: Implement Firestore channel creation
      // const channel = await createChannelInFirestore(communityId, data);
      const channel = { 
        id: `channel_${Date.now()}`, 
        communityId,
        ...data,
        createdAt: new Date(),
        position: 0,
        permissions: {
          viewChannel: ['community_admin', 'community_member'],
          sendMessages: ['community_admin', 'community_member'],
          manageMessages: ['community_admin']
        }
      } as ChatChannel; // Placeholder
      
      const { channels } = get();
      const communityChannels = channels[communityId] || [];
      
      set({
        channels: {
          ...channels,
          [communityId]: [...communityChannels, channel]
        },
        loading: false
      });
      
      return channel;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create channel',
        loading: false 
      });
      throw error;
    }
  },

  // Update channel details (admin only)
  updateChannel: async (channelId, updates) => {
    try {
      // TODO: Implement Firestore channel update
      // await updateChannelInFirestore(channelId, updates);
      
      const { channels, activeChannel } = get();
      
      // Update channel in all communities
      const updatedChannels = Object.keys(channels).reduce((acc, communityId) => {
        acc[communityId] = channels[communityId].map(c => 
          c.id === channelId ? { ...c, ...updates } : c
        );
        return acc;
      }, {} as Record<string, ChatChannel[]>);
      
      set({
        channels: updatedChannels,
        activeChannel: activeChannel?.id === channelId ? { ...activeChannel, ...updates } : activeChannel
      });
    } catch (error) {
      console.error('Failed to update channel:', error);
    }
  },

  // Delete a channel (admin only)
  deleteChannel: async (channelId) => {
    try {
      // TODO: Implement Firestore channel deletion
      // await deleteChannelFromFirestore(channelId);
      
      const { channels, activeChannel } = get();
      
      // Remove channel from all communities
      const updatedChannels = Object.keys(channels).reduce((acc, communityId) => {
        acc[communityId] = channels[communityId].filter(c => c.id !== channelId);
        return acc;
      }, {} as Record<string, ChatChannel[]>);
      
      set({
        channels: updatedChannels,
        activeChannel: activeChannel?.id === channelId ? null : activeChannel
      });
    } catch (error) {
      console.error('Failed to delete channel:', error);
    }
  },

  // Load messages for a channel
  loadMessages: async (channelId, limit = 50, before) => {
    set({ loading: true, error: null });
    try {
      // TODO: Implement Firestore query for channel messages
      // const messages = await getChannelMessages(channelId, limit, before);
      const messages: Message[] = []; // Placeholder
      
      const { messages: currentMessages } = get();
      set({
        messages: {
          ...currentMessages,
          [channelId]: before 
            ? [...(currentMessages[channelId] || []), ...messages]
            : messages
        },
        loading: false
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load messages',
        loading: false 
      });
    }
  },

  // Send a new message
  sendMessage: async (channelId, content, attachments = [], replyTo) => {
    try {
      // TODO: Implement message sending with file uploads
      // const message = await sendMessageToFirestore(channelId, content, attachments, replyTo);
      
      const message: Message = {
        id: `msg_${Date.now()}`,
        channelId,
        communityId: get().activeChannel?.communityId || '',
        authorId: 'current-user', // TODO: Get from auth store
        content,
        type: attachments.length > 0 ? 'file' : 'text',
        attachments: attachments.map((file, index) => ({
          id: `att_${Date.now()}_${index}`,
          name: file.name,
          url: URL.createObjectURL(file), // Temporary URL
          type: file.type,
          size: file.size
        })),
        reactions: [],
        replyTo,
        createdAt: new Date(),
        mentions: [] // TODO: Extract mentions from content
      };
      
      const { messages } = get();
      const channelMessages = messages[channelId] || [];
      
      set({
        messages: {
          ...messages,
          [channelId]: [...channelMessages, message]
        }
      });
      
      // Clear composition state
      get().clearComposition();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  },

  // Edit an existing message
  editMessage: async (messageId, content) => {
    try {
      // TODO: Implement Firestore message edit
      // await editMessageInFirestore(messageId, content);
      
      const { messages } = get();
      
      // Update message in all channels
      const updatedMessages = Object.keys(messages).reduce((acc, channelId) => {
        acc[channelId] = messages[channelId].map(m => 
          m.id === messageId ? { ...m, content, editedAt: new Date() } : m
        );
        return acc;
      }, {} as Record<string, Message[]>);
      
      set({ messages: updatedMessages });
    } catch (error) {
      console.error('Failed to edit message:', error);
    }
  },

  // Delete a message
  deleteMessage: async (messageId) => {
    try {
      // TODO: Implement Firestore message deletion
      // await deleteMessageFromFirestore(messageId);
      
      const { messages } = get();
      
      // Remove message from all channels
      const updatedMessages = Object.keys(messages).reduce((acc, channelId) => {
        acc[channelId] = messages[channelId].filter(m => m.id !== messageId);
        return acc;
      }, {} as Record<string, Message[]>);
      
      set({ messages: updatedMessages });
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  },

  // Add reaction to a message
  addReaction: async (messageId, emoji) => {
    try {
      // TODO: Implement Firestore reaction addition
      // await addReactionToFirestore(messageId, emoji);
      
      const { messages } = get();
      const currentUserId = 'current-user'; // TODO: Get from auth store
      
      // Update message reactions in all channels
      const updatedMessages = Object.keys(messages).reduce((acc, channelId) => {
        acc[channelId] = messages[channelId].map(m => {
          if (m.id === messageId) {
            const reactions = m.reactions || [];
            const existingReaction = reactions.find(r => r.emoji === emoji);
            
            if (existingReaction) {
              // Add user to existing reaction
              if (!existingReaction.users.includes(currentUserId)) {
                existingReaction.users.push(currentUserId);
                existingReaction.count++;
              }
            } else {
              // Create new reaction
              reactions.push({
                emoji,
                users: [currentUserId],
                count: 1
              });
            }
            
            return { ...m, reactions };
          }
          return m;
        });
        return acc;
      }, {} as Record<string, Message[]>);
      
      set({ messages: updatedMessages });
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  },

  // Remove reaction from a message
  removeReaction: async (messageId, emoji) => {
    try {
      // TODO: Implement Firestore reaction removal
      // await removeReactionFromFirestore(messageId, emoji);
      
      const { messages } = get();
      const currentUserId = 'current-user'; // TODO: Get from auth store
      
      // Update message reactions in all channels
      const updatedMessages = Object.keys(messages).reduce((acc, channelId) => {
        acc[channelId] = messages[channelId].map(m => {
          if (m.id === messageId) {
            const reactions = (m.reactions || [])
              .map(r => {
                if (r.emoji === emoji) {
                  const users = r.users.filter(u => u !== currentUserId);
                  return { ...r, users, count: users.length };
                }
                return r;
              })
              .filter(r => r.count > 0);
            
            return { ...m, reactions };
          }
          return m;
        });
        return acc;
      }, {} as Record<string, Message[]>);
      
      set({ messages: updatedMessages });
    } catch (error) {
      console.error('Failed to remove reaction:', error);
    }
  },

  // Start typing indicator
  startTyping: (channelId) => {
    // TODO: Implement real-time typing indicator
    // sendTypingIndicator(channelId, true);
  },

  // Stop typing indicator
  stopTyping: (channelId) => {
    // TODO: Implement real-time typing indicator
    // sendTypingIndicator(channelId, false);
  },

  // Message composition state management
  setMessageInput: (input) => set({ messageInput: input }),
  
  setReplyingTo: (message) => set({ replyingTo: message }),
  
  addUploadingFile: (file) => {
    const { uploadingFiles } = get();
    set({ uploadingFiles: [...uploadingFiles, file] });
  },
  
  removeUploadingFile: (index) => {
    const { uploadingFiles } = get();
    set({ uploadingFiles: uploadingFiles.filter((_, i) => i !== index) });
  },
  
  clearComposition: () => set({ 
    messageInput: '', 
    replyingTo: null, 
    uploadingFiles: [] 
  }),

  // Real-time subscriptions (placeholders)
  subscribeToChannel: (channelId) => {
    // TODO: Implement Firestore real-time subscription for messages
    // return onSnapshot(messagesQuery, (snapshot) => {
    //   // Update messages in real-time
    // });
    return () => {}; // Cleanup function
  },

  subscribeToTyping: (channelId) => {
    // TODO: Implement real-time typing indicators
    // return onSnapshot(typingQuery, (snapshot) => {
    //   // Update typing indicators
    // });
    return () => {}; // Cleanup function
  }
}));
