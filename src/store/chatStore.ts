import { create } from 'zustand';
import {
  Message,
  MessageReaction,
  TypingIndicator,
  ChatState,
  QuestionAnswer,
  Thread,
  ThreadMessage
} from '../types';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  where,
  Timestamp,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  writeBatch,
  getDocs,
  startAfter,
  increment
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// Helper function to extract mentions from message content
const extractMentions = (content: string): string[] => {
  const mentionRegex = /@(\w+)/g;
  const mentions: string[] = [];
  let match;

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push(match[1]);
  }

  return mentions;
};

interface ExtendedChatState extends ChatState {
  // Real-time subscriptions cleanup
  unsubscribeMessages: Record<string, () => void>; // communityId -> unsubscribe
  unsubscribeTyping: Record<string, () => void>; // communityId -> unsubscribe
  unsubscribeThreads: Record<string, () => void>; // messageId -> unsubscribe

  // Actions
  loadMessages: (communityId: string, limit?: number) => Promise<void>;
  loadMoreMessages: (communityId: string) => Promise<void>;
  sendMessage: (communityId: string, content: string, replyTo?: string) => Promise<void>;
  sendResourceMessage: (communityId: string, resourceId: string, resourceName: string, resourceUrl: string, resourceType: string, uploadedBy: string, uploadedByName: string) => Promise<void>;
  sendQuestionMessage: (communityId: string, content: string, replyTo?: string) => Promise<void>;
  editMessage: (messageId: string, content: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;

  // Reactions
  toggleReaction: (messageId: string, emoji: string) => Promise<void>;
  toggleThreadReaction: (messageId: string, threadMessageId: string, emoji: string) => Promise<void>;

  // Pinning (admin only)
  togglePinMessage: (messageId: string) => Promise<void>;
  loadPinnedMessages: (communityId: string) => Promise<void>;

  // Q&A
  addQuestionAnswer: (messageId: string, content: string) => Promise<void>;

  // Typing indicators
  startTyping: (communityId: string) => void;
  stopTyping: (communityId: string) => void;

  // Message composition
  setMessageInput: (input: string) => void;
  setReplyingTo: (message: Message | null) => void;
  setQuestionMode: (isQuestion: boolean) => void;
  clearComposition: () => void;

  // Real-time subscriptions
  subscribeToMessages: (communityId: string) => void;
  subscribeToTyping: (communityId: string) => void;
  unsubscribeFromCommunity: (communityId: string) => void;

  // Thread actions
  openThread: (messageId: string) => void;
  closeThread: () => void;
  createThread: (communityId: string, messageId: string, threadName?: string, firstMessage?: string) => Promise<void>;
  loadThreadMessages: (messageId: string) => Promise<void>;
  sendThreadMessage: (messageId: string, content: string) => Promise<void>;
  subscribeToThread: (messageId: string) => void;
  unsubscribeFromThread: (messageId: string) => void;
  setThreadInput: (input: string) => void;
  setThreadName: (name: string) => void;

  // Utility
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useChatStore = create<ExtendedChatState>((set, get) => ({
  // Initial state
  messages: {},
  pinnedMessages: {},
  typingIndicators: [],
  loading: false,
  error: null,
  messageInput: '',
  replyingTo: null,
  isQuestionMode: false,
  hasMoreMessages: {},
  lastMessageTimestamp: {},
  unsubscribeMessages: {},
  unsubscribeTyping: {},

  // Thread state
  threads: {},
  threadMessages: {},
  activeThread: null,
  threadSidebarOpen: false,
  threadInput: '',
  threadName: '',
  unsubscribeThreads: {},

  // Load messages for a community
  loadMessages: async (communityId, messageLimit = 50) => {
    set({ loading: true, error: null });
    try {
      console.log('📨 [CHAT] Loading messages for community:', communityId);

      const messagesRef = collection(db, 'communities', communityId, 'messages');
      const messagesQuery = query(
        messagesRef,
        orderBy('createdAt', 'desc'),
        limit(messageLimit)
      );

      const snapshot = await getDocs(messagesQuery);
      const messages: Message[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          editedAt: data.editedAt?.toDate(),
          pinnedAt: data.pinnedAt?.toDate()
        } as Message;
      }).reverse(); // Reverse to show oldest first

      const { messages: currentMessages } = get();
      set({
        messages: {
          ...currentMessages,
          [communityId]: messages
        },
        hasMoreMessages: {
          ...get().hasMoreMessages,
          [communityId]: snapshot.docs.length === messageLimit
        },
        lastMessageTimestamp: {
          ...get().lastMessageTimestamp,
          [communityId]: messages[0]?.createdAt || new Date()
        },
        loading: false
      });

      console.log('✅ [CHAT] Loaded', messages.length, 'messages');
    } catch (error) {
      console.error('❌ [CHAT] Failed to load messages:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load messages',
        loading: false
      });
    }
  },

  // Load more messages (pagination)
  loadMoreMessages: async (communityId) => {
    const { hasMoreMessages, lastMessageTimestamp, loading } = get();

    if (!hasMoreMessages[communityId] || loading) return;

    set({ loading: true });
    try {
      console.log('📨 [CHAT] Loading more messages for community:', communityId);

      const messagesRef = collection(db, 'communities', communityId, 'messages');
      const messagesQuery = query(
        messagesRef,
        orderBy('createdAt', 'desc'),
        startAfter(Timestamp.fromDate(lastMessageTimestamp[communityId])),
        limit(25)
      );

      const snapshot = await getDocs(messagesQuery);
      const newMessages: Message[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          editedAt: data.editedAt?.toDate(),
          pinnedAt: data.pinnedAt?.toDate()
        } as Message;
      }).reverse();

      const { messages: currentMessages } = get();
      const existingMessages = currentMessages[communityId] || [];

      set({
        messages: {
          ...currentMessages,
          [communityId]: [...newMessages, ...existingMessages]
        },
        hasMoreMessages: {
          ...get().hasMoreMessages,
          [communityId]: snapshot.docs.length === 25
        },
        lastMessageTimestamp: {
          ...get().lastMessageTimestamp,
          [communityId]: newMessages[0]?.createdAt || lastMessageTimestamp[communityId]
        },
        loading: false
      });

      console.log('✅ [CHAT] Loaded', newMessages.length, 'more messages');
    } catch (error) {
      console.error('❌ [CHAT] Failed to load more messages:', error);
      set({ loading: false });
    }
  },

  // Send a text message
  sendMessage: async (communityId, content, replyTo) => {
    const { useAuthStore } = await import('./authStore');
    const { user } = useAuthStore.getState();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { messages, isQuestionMode } = get();

    // 🔍 Get reply context if replying to a message
    let replyContext = {};
    if (replyTo) {
      const currentMessages = messages[communityId] || [];
      const originalMessage = currentMessages.find(msg => msg.id === replyTo);
      if (originalMessage) {
        // Create snippet (first 50 characters)
        const snippet = originalMessage.content.length > 50
          ? originalMessage.content.substring(0, 50) + '...'
          : originalMessage.content;

        replyContext = {
          replyTo: replyTo,
          replyToMessageId: replyTo,
          replyToSenderName: originalMessage.authorName,
          replyToMessageSnippet: snippet
        };
      }
    }

    // 🚀 OPTIMISTIC UPDATE: Clear input and show message immediately
    const optimisticId = `temp_${Date.now()}_${user.uid.slice(-6)}_${Math.random().toString(36).slice(2, 8)}`;
    const optimisticMessage: Message = {
      id: optimisticId,
      communityId,
      authorId: user.uid,
      authorName: user.displayName || 'Anonymous',
      authorAvatar: user.photoURL || '',
      content: content.trim(),
      type: isQuestionMode ? 'question' : 'text',
      isPinned: false,
      isQuestion: isQuestionMode,
      reactions: [],
      mentions: extractMentions(content),
      createdAt: new Date(),
      ...replyContext
    };

    // Immediately update UI
    const currentMessages = messages[communityId] || [];
    set({
      messages: {
        ...messages,
        [communityId]: [...currentMessages, optimisticMessage]
      }
    });

    // Clear composition state immediately
    get().clearComposition();

    // 🔥 BACKGROUND: Send to Firestore asynchronously
    try {
      const messagesRef = collection(db, 'communities', communityId, 'messages');
      const messageData = {
        communityId,
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        authorAvatar: user.photoURL || '',
        content: content.trim(),
        type: isQuestionMode ? 'question' : 'text',
        isPinned: false,
        isQuestion: isQuestionMode,
        reactions: [],
        mentions: extractMentions(content),
        createdAt: serverTimestamp(),
        ...replyContext
      };

      // Send to Firestore (this will trigger real-time listener to replace optimistic message)
      await addDoc(messagesRef, messageData);

      console.log('✅ [CHAT] Message sent successfully');

      // 🔧 CLEANUP: Remove optimistic message after successful Firestore write
      // The real-time listener will add the Firestore version
      setTimeout(() => {
        const { messages: currentMessages } = get();
        const currentCommunityMessages = currentMessages[communityId] || [];
        const cleanedMessages = currentCommunityMessages.filter(msg => msg.id !== optimisticId);

        set({
          messages: {
            ...currentMessages,
            [communityId]: cleanedMessages
          }
        });
      }, 1000); // Small delay to ensure Firestore listener has processed
    } catch (error) {
      console.error('❌ [CHAT] Failed to send message:', error);

      // 🔄 ROLLBACK: Remove optimistic message on failure
      const rollbackMessages = messages[communityId]?.filter(msg => msg.id !== optimisticId) || [];
      set({
        messages: {
          ...messages,
          [communityId]: rollbackMessages
        },
        error: error instanceof Error ? error.message : 'Failed to send message'
      });
    }
  },

  // Send a resource attachment message
  sendResourceMessage: async (communityId, resourceId, resourceName, resourceUrl, resourceType, uploadedBy, uploadedByName) => {
    try {
      console.log('📎 [CHAT] Sending resource message to community:', communityId);

      const { useAuthStore } = await import('./authStore');
      const { user } = useAuthStore.getState();

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Handle undefined uploadedByName with fallback
      const safeUploadedByName = uploadedByName || 'Unknown User';

      console.log('📎 [CHAT] Resource attachment data:', {
        resourceId,
        resourceName,
        uploadedBy,
        uploadedByName: safeUploadedByName
      });

      const messagesRef = collection(db, 'communities', communityId, 'messages');
      const messageData = {
        communityId,
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        authorAvatar: user.photoURL || '',
        content: `📎 Shared resource: ${resourceName}`,
        type: 'resource' as const,
        resourceAttachment: {
          resourceId,
          resourceName,
          resourceUrl,
          resourceType,
          uploadedBy,
          uploadedByName: safeUploadedByName // Use safe fallback value
        },
        isPinned: false,
        reactions: [],
        mentions: [],
        createdAt: serverTimestamp()
      };

      console.log('📎 [CHAT] Final message data before Firestore write:', messageData);

      await addDoc(messagesRef, messageData);

      console.log('✅ [CHAT] Resource message sent successfully');
    } catch (error) {
      console.error('❌ [CHAT] Failed to send resource message:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to send resource message' });
    }
  },

  // Send a question message
  sendQuestionMessage: async (communityId, content, replyTo) => {
    const { useAuthStore } = await import('./authStore');
    const { user } = useAuthStore.getState();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { messages } = get();

    // 🔍 Get reply context if replying to a message
    let replyContext = {};
    if (replyTo) {
      const currentMessages = messages[communityId] || [];
      const originalMessage = currentMessages.find(msg => msg.id === replyTo);
      if (originalMessage) {
        // Create snippet (first 50 characters)
        const snippet = originalMessage.content.length > 50
          ? originalMessage.content.substring(0, 50) + '...'
          : originalMessage.content;

        replyContext = {
          replyTo: replyTo,
          replyToMessageId: replyTo,
          replyToSenderName: originalMessage.authorName,
          replyToMessageSnippet: snippet
        };
      }
    }

    // 🚀 OPTIMISTIC UPDATE: Clear input and show message immediately
    const optimisticId = `temp_${Date.now()}_${user.uid.slice(-6)}_${Math.random().toString(36).slice(2, 8)}`;
    const optimisticMessage: Message = {
      id: optimisticId,
      communityId,
      authorId: user.uid,
      authorName: user.displayName || 'Anonymous',
      authorAvatar: user.photoURL || '',
      content: content.trim(),
      type: 'question',
      isQuestion: true,
      questionAnswers: [],
      isPinned: false,
      reactions: [],
      mentions: extractMentions(content),
      createdAt: new Date(),
      ...replyContext
    };

    // Immediately update UI
    const currentMessages = messages[communityId] || [];
    set({
      messages: {
        ...messages,
        [communityId]: [...currentMessages, optimisticMessage]
      }
    });

    // Clear composition state immediately
    get().clearComposition();

    // 🔥 BACKGROUND: Send to Firestore asynchronously
    try {
      const messagesRef = collection(db, 'communities', communityId, 'messages');
      const messageData = {
        communityId,
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        authorAvatar: user.photoURL || '',
        content: content.trim(),
        type: 'question' as const,
        isQuestion: true,
        questionAnswers: [],
        isPinned: false,
        reactions: [],
        mentions: extractMentions(content),
        createdAt: serverTimestamp(),
        ...replyContext
      };

      // Send to Firestore (this will trigger real-time listener to replace optimistic message)
      await addDoc(messagesRef, messageData);

      console.log('✅ [CHAT] Question message sent successfully');

      // 🔧 CLEANUP: Remove optimistic message after successful Firestore write
      // The real-time listener will add the Firestore version
      setTimeout(() => {
        const { messages: currentMessages } = get();
        const currentCommunityMessages = currentMessages[communityId] || [];
        const cleanedMessages = currentCommunityMessages.filter(msg => msg.id !== optimisticId);

        set({
          messages: {
            ...currentMessages,
            [communityId]: cleanedMessages
          }
        });
      }, 1000); // Small delay to ensure Firestore listener has processed
    } catch (error) {
      console.error('❌ [CHAT] Failed to send question message:', error);

      // 🔄 ROLLBACK: Remove optimistic message on failure
      const rollbackMessages = messages[communityId]?.filter(msg => msg.id !== optimisticId) || [];
      set({
        messages: {
          ...messages,
          [communityId]: rollbackMessages
        },
        error: error instanceof Error ? error.message : 'Failed to send question message'
      });
    }
  },

  // Edit an existing message
  editMessage: async (messageId, content) => {
    try {
      console.log('✏️ [CHAT] Editing message:', messageId);

      // Find the message in all communities to get the community ID
      const { messages } = get();
      let communityId = '';

      for (const [cId, msgs] of Object.entries(messages)) {
        if (msgs.find(m => m.id === messageId)) {
          communityId = cId;
          break;
        }
      }

      if (!communityId) {
        throw new Error('Message not found');
      }

      const messageRef = doc(db, 'communities', communityId, 'messages', messageId);
      await updateDoc(messageRef, {
        content: content.trim(),
        editedAt: serverTimestamp(),
        mentions: extractMentions(content)
      });

      console.log('✅ [CHAT] Message edited successfully');
    } catch (error) {
      console.error('❌ [CHAT] Failed to edit message:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to edit message' });
    }
  },

  // Delete a message
  deleteMessage: async (messageId) => {
    try {
      console.log('🗑️ [CHAT] Deleting message:', messageId);

      // Find the message in all communities to get the community ID
      const { messages } = get();
      let communityId = '';

      for (const [cId, msgs] of Object.entries(messages)) {
        if (msgs.find(m => m.id === messageId)) {
          communityId = cId;
          break;
        }
      }

      if (!communityId) {
        throw new Error('Message not found');
      }

      const messageRef = doc(db, 'communities', communityId, 'messages', messageId);
      await deleteDoc(messageRef);

      console.log('✅ [CHAT] Message deleted successfully');
    } catch (error) {
      console.error('❌ [CHAT] Failed to delete message:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to delete message' });
    }
  },

  // Toggle reaction on a message
  toggleReaction: async (messageId, emoji) => {
    try {
      console.log('😊 [CHAT] Toggling reaction on message:', messageId, emoji);

      const { useAuthStore } = await import('./authStore');
      const { user } = useAuthStore.getState();

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Find the message in all communities to get the community ID
      const { messages } = get();
      let communityId = '';
      let message: Message | null = null;

      for (const [cId, msgs] of Object.entries(messages)) {
        const foundMessage = msgs.find(m => m.id === messageId);
        if (foundMessage) {
          communityId = cId;
          message = foundMessage;
          break;
        }
      }

      if (!communityId || !message) {
        throw new Error('Message not found');
      }

      const reactions = message.reactions || [];
      const existingReaction = reactions.find(r => r.emoji === emoji);

      let updatedReactions;
      if (existingReaction) {
        // Toggle user's reaction
        if (existingReaction.users.includes(user.uid)) {
          // Remove user's reaction
          const updatedUsers = existingReaction.users.filter(uid => uid !== user.uid);
          if (updatedUsers.length === 0) {
            // Remove reaction entirely if no users left
            updatedReactions = reactions.filter(r => r.emoji !== emoji);
          } else {
            updatedReactions = reactions.map(r =>
              r.emoji === emoji
                ? { ...r, users: updatedUsers, count: updatedUsers.length }
                : r
            );
          }
        } else {
          // Add user's reaction
          updatedReactions = reactions.map(r =>
            r.emoji === emoji
              ? { ...r, users: [...r.users, user.uid], count: r.count + 1 }
              : r
          );
        }
      } else {
        // Add new reaction
        updatedReactions = [...reactions, {
          emoji,
          users: [user.uid],
          count: 1
        }];
      }

      // 🚀 OPTIMISTIC UPDATE: Update local state immediately
      const currentMessages = messages[communityId] || [];
      const updatedMessages = currentMessages.map(msg =>
        msg.id === messageId
          ? { ...msg, reactions: updatedReactions }
          : msg
      );

      set({
        messages: {
          ...messages,
          [communityId]: updatedMessages
        }
      });

      // 🔥 BACKGROUND: Update Firestore
      const messageRef = doc(db, 'communities', communityId, 'messages', messageId);
      await updateDoc(messageRef, { reactions: updatedReactions });

      console.log('✅ [CHAT] Reaction toggled successfully');
    } catch (error) {
      console.error('❌ [CHAT] Failed to toggle reaction:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to toggle reaction' });

      // TODO: Rollback optimistic update on error
    }
  },

  // Toggle reaction on a thread message
  toggleThreadReaction: async (messageId, threadMessageId, emoji) => {
    try {
      console.log('😊 [THREAD] Toggling reaction on thread message:', threadMessageId, emoji);

      const { useAuthStore } = await import('./authStore');
      const { user } = useAuthStore.getState();

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Find the parent message to get community ID
      const { messages, threadMessages } = get();
      let communityId = '';

      for (const [cId, msgs] of Object.entries(messages)) {
        if (msgs.find(m => m.id === messageId)) {
          communityId = cId;
          break;
        }
      }

      if (!communityId) {
        throw new Error('Community not found for thread message');
      }

      // Find the thread message
      const currentThreadMessages = threadMessages[messageId] || [];
      const threadMessage = currentThreadMessages.find(tm => tm.id === threadMessageId);

      if (!threadMessage) {
        throw new Error('Thread message not found');
      }

      const reactions = threadMessage.reactions || [];
      const existingReaction = reactions.find(r => r.emoji === emoji);

      let updatedReactions;
      if (existingReaction) {
        // Toggle user's reaction
        if (existingReaction.users.includes(user.uid)) {
          // Remove user's reaction
          const updatedUsers = existingReaction.users.filter(uid => uid !== user.uid);
          if (updatedUsers.length === 0) {
            // Remove reaction entirely if no users left
            updatedReactions = reactions.filter(r => r.emoji !== emoji);
          } else {
            updatedReactions = reactions.map(r =>
              r.emoji === emoji
                ? { ...r, users: updatedUsers, count: updatedUsers.length }
                : r
            );
          }
        } else {
          // Add user's reaction
          updatedReactions = reactions.map(r =>
            r.emoji === emoji
              ? { ...r, users: [...r.users, user.uid], count: r.count + 1 }
              : r
          );
        }
      } else {
        // Add new reaction
        updatedReactions = [...reactions, {
          emoji,
          users: [user.uid],
          count: 1
        }];
      }

      // 🚀 OPTIMISTIC UPDATE: Update local state immediately
      const updatedThreadMessages = currentThreadMessages.map(tm =>
        tm.id === threadMessageId
          ? { ...tm, reactions: updatedReactions }
          : tm
      );

      set({
        threadMessages: {
          ...threadMessages,
          [messageId]: updatedThreadMessages
        }
      });

      // 🔥 BACKGROUND: Update Firestore
      const threadMessageRef = doc(db, 'communities', communityId, 'messages', messageId, 'threads', threadMessageId);
      await updateDoc(threadMessageRef, { reactions: updatedReactions });

      console.log('✅ [THREAD] Thread reaction toggled successfully');
    } catch (error) {
      console.error('❌ [THREAD] Failed to toggle thread reaction:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to toggle thread reaction' });

      // TODO: Rollback optimistic update on error
    }
  },

  // Toggle pin message (admin only)
  togglePinMessage: async (messageId) => {
    try {
      console.log('📌 [CHAT] Toggling pin on message:', messageId);

      const { useAuthStore } = await import('./authStore');
      const { user } = useAuthStore.getState();

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Find the message in all communities to get the community ID
      const { messages } = get();
      let communityId = '';
      let message: Message | null = null;

      for (const [cId, msgs] of Object.entries(messages)) {
        const foundMessage = msgs.find(m => m.id === messageId);
        if (foundMessage) {
          communityId = cId;
          message = foundMessage;
          break;
        }
      }

      if (!communityId || !message) {
        throw new Error('Message not found');
      }

      const messageRef = doc(db, 'communities', communityId, 'messages', messageId);
      const isPinned = !message.isPinned;

      await updateDoc(messageRef, {
        isPinned,
        pinnedBy: isPinned ? user.uid : null,
        pinnedAt: isPinned ? serverTimestamp() : null
      });

      console.log('✅ [CHAT] Message pin toggled successfully');
    } catch (error) {
      console.error('❌ [CHAT] Failed to toggle pin:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to toggle pin' });
    }
  },

  // Load pinned messages for a community
  loadPinnedMessages: async (communityId) => {
    try {
      console.log('📌 [CHAT] Loading pinned messages for community:', communityId);

      const messagesRef = collection(db, 'communities', communityId, 'messages');

      // Use a simpler query to avoid index issues
      const pinnedQuery = query(
        messagesRef,
        where('isPinned', '==', true),
        orderBy('createdAt', 'desc') // Use createdAt instead of pinnedAt to avoid index issues
      );

      console.log('📌 [CHAT] Executing pinned messages query...');
      const snapshot = await getDocs(pinnedQuery);
      const pinnedMessages: Message[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          editedAt: data.editedAt?.toDate(),
          pinnedAt: data.pinnedAt?.toDate()
        } as Message;
      });

      const { pinnedMessages: currentPinned } = get();
      set({
        pinnedMessages: {
          ...currentPinned,
          [communityId]: pinnedMessages
        }
      });

      console.log('✅ [CHAT] Loaded', pinnedMessages.length, 'pinned messages');
    } catch (error) {
      console.error('❌ [CHAT] Failed to load pinned messages:', error);

      // More specific error handling for Firestore internal assertion errors
      if (error instanceof Error) {
        if (error.message.includes('INTERNAL ASSERTION FAILED')) {
          console.error('🚨 [CHAT] Firestore internal assertion error - likely index issue');
          set({ error: 'Chat system temporarily unavailable. Please refresh the page.' });
        } else {
          set({ error: error.message });
        }
      } else {
        set({ error: 'Failed to load pinned messages' });
      }
    }
  },

  // Add answer to a question message
  addQuestionAnswer: async (messageId, content) => {
    try {
      console.log('💬 [CHAT] Adding answer to question:', messageId);

      const { useAuthStore } = await import('./authStore');
      const { user } = useAuthStore.getState();

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Find the message in all communities to get the community ID
      const { messages } = get();
      let communityId = '';
      let message: Message | null = null;

      for (const [cId, msgs] of Object.entries(messages)) {
        const foundMessage = msgs.find(m => m.id === messageId);
        if (foundMessage) {
          communityId = cId;
          message = foundMessage;
          break;
        }
      }

      if (!communityId || !message) {
        throw new Error('Message not found');
      }

      const answer: QuestionAnswer = {
        id: `answer_${Date.now()}`,
        authorId: user.uid,
        authorName: user.displayName,
        content: content.trim(),
        createdAt: new Date(),
        reactions: []
      };

      const messageRef = doc(db, 'communities', communityId, 'messages', messageId);
      await updateDoc(messageRef, {
        questionAnswers: arrayUnion(answer)
      });

      console.log('✅ [CHAT] Answer added successfully');
    } catch (error) {
      console.error('❌ [CHAT] Failed to add answer:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to add answer' });
    }
  },

  // Start typing indicator
  startTyping: (communityId) => {
    const { useAuthStore } = require('./authStore');
    const { user } = useAuthStore.getState();

    if (!user) return;

    try {
      const typingRef = doc(db, 'typing', communityId, 'indicators', user.uid);
      updateDoc(typingRef, {
        userId: user.uid,
        userName: user.displayName,
        communityId,
        timestamp: serverTimestamp()
      }).catch(() => {
        // Document might not exist, create it
        addDoc(collection(db, 'typing', communityId, 'indicators'), {
          userId: user.uid,
          userName: user.displayName,
          communityId,
          timestamp: serverTimestamp()
        });
      });
    } catch (error) {
      console.error('Failed to start typing indicator:', error);
    }
  },

  // Stop typing indicator
  stopTyping: (communityId) => {
    const { useAuthStore } = require('./authStore');
    const { user } = useAuthStore.getState();

    if (!user) return;

    try {
      const typingRef = doc(db, 'typing', communityId, 'indicators', user.uid);
      deleteDoc(typingRef).catch(() => {
        // Document might not exist, ignore error
      });
    } catch (error) {
      console.error('Failed to stop typing indicator:', error);
    }
  },

  // Message composition state management
  setMessageInput: (input) => set({ messageInput: input }),

  setReplyingTo: (message) => set({ replyingTo: message }),

  setQuestionMode: (isQuestion) => set({ isQuestionMode: isQuestion }),

  clearComposition: () => set({
    messageInput: '',
    replyingTo: null,
    isQuestionMode: false
  }),

  // Real-time subscriptions
  subscribeToMessages: (communityId) => {
    console.log('🔄 [CHAT] Subscribing to messages for community:', communityId);

    // Clean up any existing subscription for this community first
    const { unsubscribeMessages: existingUnsubscribes } = get();
    if (existingUnsubscribes[communityId]) {
      console.log('🔌 [CHAT] Cleaning up existing subscription for:', communityId);
      existingUnsubscribes[communityId]();
      delete existingUnsubscribes[communityId];
    }

    const messagesRef = collection(db, 'communities', communityId, 'messages');
    const messagesQuery = query(
      messagesRef,
      orderBy('createdAt', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const { messages: currentMessages } = get();
      const currentCommunityMessages = currentMessages[communityId] || [];

      // 🚀 PERFORMANCE: Smart merge to prevent duplicates
      const firestoreMessages: Message[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          editedAt: data.editedAt?.toDate(),
          pinnedAt: data.pinnedAt?.toDate()
        } as Message;
      }).reverse(); // Reverse to show oldest first

      // 🔧 FIX DUPLICATES: Filter out optimistic messages that now exist in Firestore
      const optimisticMessages = currentCommunityMessages.filter(msg => {
        // Keep only optimistic messages that don't have a Firestore counterpart
        if (!msg.id.startsWith('temp_')) return false;

        // Check if this optimistic message matches any Firestore message by content and author
        const hasFirestoreMatch = firestoreMessages.some(fsMsg =>
          fsMsg.authorId === msg.authorId &&
          fsMsg.content === msg.content &&
          Math.abs(fsMsg.createdAt.getTime() - msg.createdAt.getTime()) < 10000 // Within 10 seconds
        );

        if (hasFirestoreMatch) {
          console.log('🔧 [CHAT] Removing optimistic message (found Firestore match):', msg.id);
        }

        return !hasFirestoreMatch;
      });

      console.log('📊 [CHAT] Message counts - Firestore:', firestoreMessages.length, 'Optimistic:', optimisticMessages.length, 'Total:', firestoreMessages.length + optimisticMessages.length);

      const finalMessages = [...firestoreMessages, ...optimisticMessages]
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      // 🔥 INSTANT UPDATE: Use requestAnimationFrame for smooth UI updates
      requestAnimationFrame(() => {
        set({
          messages: {
            ...get().messages,
            [communityId]: finalMessages
          }
        });
      });
    }, (error) => {
      console.error('❌ [CHAT] Messages subscription error:', error);

      // Handle specific Firestore internal assertion errors
      if (error instanceof Error && error.message.includes('INTERNAL ASSERTION FAILED')) {
        console.error('🚨 [CHAT] Firestore internal assertion error in subscription');
        set({ error: 'Chat system temporarily unavailable. Please refresh the page.' });
      } else {
        set({ error: 'Failed to sync messages' });
      }
    });

    const { unsubscribeMessages } = get();
    set({
      unsubscribeMessages: {
        ...unsubscribeMessages,
        [communityId]: unsubscribe
      }
    });
  },

  subscribeToTyping: (communityId) => {
    console.log('⌨️ [CHAT] Subscribing to typing indicators for community:', communityId);

    const typingRef = collection(db, 'typing', communityId, 'indicators');

    const unsubscribe = onSnapshot(typingRef, (snapshot) => {
      const indicators: TypingIndicator[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          userId: data.userId,
          userName: data.userName,
          communityId: data.communityId,
          timestamp: data.timestamp?.toDate() || new Date()
        };
      }).filter(indicator => {
        // Filter out old typing indicators (older than 5 seconds)
        const now = new Date();
        const diff = now.getTime() - indicator.timestamp.getTime();
        return diff < 5000;
      });

      set({ typingIndicators: indicators });
    }, (error) => {
      console.error('❌ [CHAT] Typing subscription error:', error);
    });

    const { unsubscribeTyping } = get();
    set({
      unsubscribeTyping: {
        ...unsubscribeTyping,
        [communityId]: unsubscribe
      }
    });
  },

  unsubscribeFromCommunity: (communityId) => {
    console.log('🔌 [CHAT] Unsubscribing from community:', communityId);

    const { unsubscribeMessages, unsubscribeTyping } = get();

    // Unsubscribe from messages
    if (unsubscribeMessages[communityId]) {
      unsubscribeMessages[communityId]();
      delete unsubscribeMessages[communityId];
    }

    // Unsubscribe from typing
    if (unsubscribeTyping[communityId]) {
      unsubscribeTyping[communityId]();
      delete unsubscribeTyping[communityId];
    }

    set({ unsubscribeMessages, unsubscribeTyping });
  },

  // Thread functions
  openThread: (messageId) => {
    set({
      activeThread: messageId,
      threadSidebarOpen: true,
      threadInput: '',
      threadName: ''
    });
  },

  closeThread: () => {
    set({
      activeThread: null,
      threadSidebarOpen: false,
      threadInput: '',
      threadName: ''
    });
  },

  createThread: async (communityId, messageId, threadName, firstMessage) => {
    try {
      console.log('🧵 [THREAD] Creating thread for message:', messageId);

      const { useAuthStore } = await import('./authStore');
      const { user } = useAuthStore.getState();

      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('🧵 [THREAD] User authenticated:', user.uid);
      console.log('🧵 [THREAD] Thread data:', { communityId, messageId, threadName, firstMessage });

      // First, just update the message to indicate it has a thread
      const messageRef = doc(db, 'communities', communityId, 'messages', messageId);

      console.log('🧵 [THREAD] Updating message with thread info...');
      await updateDoc(messageRef, {
        hasThread: true,
        threadCount: firstMessage ? 1 : 0,
        threadName: threadName || ''
      });

      console.log('✅ [THREAD] Message updated successfully');

      // Add first message if provided
      if (firstMessage) {
        console.log('🧵 [THREAD] Adding first thread message...');
        const threadsRef = collection(db, 'communities', communityId, 'messages', messageId, 'threads');
        const threadMessageData = {
          parentMessageId: messageId,
          communityId,
          authorId: user.uid,
          authorName: user.displayName || 'Anonymous',
          authorAvatar: user.photoURL || '',
          content: firstMessage.trim(),
          type: 'text',
          reactions: [],
          mentions: extractMentions(firstMessage),
          createdAt: serverTimestamp()
        };

        console.log('🧵 [THREAD] Thread message data:', threadMessageData);
        await addDoc(threadsRef, threadMessageData);
        console.log('✅ [THREAD] First thread message added');
      }

      // Create thread metadata for local state
      const threadData: Thread = {
        id: messageId,
        parentMessageId: messageId,
        communityId,
        name: threadName,
        createdBy: user.uid,
        createdAt: new Date(),
        lastActivity: new Date(),
        messageCount: firstMessage ? 1 : 0,
        participants: [user.uid]
      };

      // Update local state
      const { threads } = get();
      set({
        threads: {
          ...threads,
          [messageId]: threadData
        },
        activeThread: messageId,
        threadSidebarOpen: true,
        threadInput: '',
        threadName: ''
      });

      console.log('✅ [THREAD] Thread created successfully');
    } catch (error) {
      console.error('❌ [THREAD] Failed to create thread:', error);
      console.error('❌ [THREAD] Error details:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to create thread' });
    }
  },

  loadThreadMessages: async (messageId) => {
    try {
      console.log('📨 [THREAD] Loading thread messages for:', messageId);

      // Get the parent message to find communityId
      const { messages } = get();
      let communityId = '';

      // Find the community ID from existing messages
      for (const [cId, msgs] of Object.entries(messages)) {
        if (msgs.find(m => m.id === messageId)) {
          communityId = cId;
          break;
        }
      }

      if (!communityId) {
        throw new Error('Could not find community for message');
      }

      const threadsRef = collection(db, 'communities', communityId, 'messages', messageId, 'threads');
      const threadsQuery = query(threadsRef, orderBy('createdAt', 'asc'));

      const snapshot = await getDocs(threadsQuery);
      const threadMessages: ThreadMessage[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          editedAt: data.editedAt?.toDate()
        } as ThreadMessage;
      });

      const { threadMessages: currentThreadMessages } = get();
      set({
        threadMessages: {
          ...currentThreadMessages,
          [messageId]: threadMessages
        }
      });

      console.log('✅ [THREAD] Loaded', threadMessages.length, 'thread messages');
    } catch (error) {
      console.error('❌ [THREAD] Failed to load thread messages:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to load thread messages' });
    }
  },

  sendThreadMessage: async (messageId, content) => {
    const { useAuthStore } = await import('./authStore');
    const { user } = useAuthStore.getState();

    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get the parent message to find communityId
    const { messages, threadMessages } = get();
    let communityId = '';

    // Find the community ID from existing messages
    for (const [cId, msgs] of Object.entries(messages)) {
      if (msgs.find(m => m.id === messageId)) {
        communityId = cId;
        break;
      }
    }

    if (!communityId) {
      throw new Error('Could not find community for message');
    }

    // 🚀 OPTIMISTIC UPDATE: Clear input and show message immediately
    const optimisticId = `temp_${Date.now()}_${Math.random()}`;
    const optimisticMessage: ThreadMessage = {
      id: optimisticId,
      parentMessageId: messageId,
      communityId,
      authorId: user.uid,
      authorName: user.displayName || 'Anonymous',
      authorAvatar: user.photoURL || '',
      content: content.trim(),
      type: 'text',
      reactions: [],
      mentions: extractMentions(content),
      createdAt: new Date()
    };

    // Immediately update UI
    const currentThreadMessages = threadMessages[messageId] || [];
    set({
      threadMessages: {
        ...threadMessages,
        [messageId]: [...currentThreadMessages, optimisticMessage]
      },
      threadInput: '' // Clear input immediately
    });

    // 🔥 BACKGROUND: Send to Firestore asynchronously
    try {
      const threadsRef = collection(db, 'communities', communityId, 'messages', messageId, 'threads');
      const threadMessageData = {
        parentMessageId: messageId,
        communityId,
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        authorAvatar: user.photoURL || '',
        content: content.trim(),
        type: 'text',
        reactions: [],
        mentions: extractMentions(content),
        createdAt: serverTimestamp()
      };

      // Send to Firestore (this will trigger real-time listener to replace optimistic message)
      await addDoc(threadsRef, threadMessageData);

      // Update thread count on parent message (non-blocking)
      const messageRef = doc(db, 'communities', communityId, 'messages', messageId);
      const currentMessages = messages[communityId] || [];
      const parentMessage = currentMessages.find(m => m.id === messageId);
      const newCount = (parentMessage?.threadCount || 0) + 1;

      updateDoc(messageRef, {
        threadCount: newCount,
        hasThread: true
      }).catch(error => {
        console.warn('⚠️ [THREAD] Failed to update thread count:', error);
      });

    } catch (error) {
      console.error('❌ [THREAD] Failed to send thread message:', error);

      // 🔄 ROLLBACK: Remove optimistic message on failure
      const rollbackMessages = threadMessages[messageId]?.filter(msg => msg.id !== optimisticId) || [];
      set({
        threadMessages: {
          ...threadMessages,
          [messageId]: rollbackMessages
        },
        error: error instanceof Error ? error.message : 'Failed to send thread message'
      });
    }
  },

  subscribeToThread: (messageId) => {
    try {
      console.log('🔄 [THREAD] Subscribing to thread:', messageId);

      // Get the parent message to find communityId
      const { messages } = get();
      let communityId = '';

      // Find the community ID from existing messages
      for (const [cId, msgs] of Object.entries(messages)) {
        if (msgs.find(m => m.id === messageId)) {
          communityId = cId;
          break;
        }
      }

      if (!communityId) {
        console.error('Could not find community for message');
        return;
      }

      const threadsRef = collection(db, 'communities', communityId, 'messages', messageId, 'threads');
      const threadsQuery = query(threadsRef, orderBy('createdAt', 'asc'));

      const unsubscribe = onSnapshot(threadsQuery, (snapshot) => {
        const { threadMessages: currentThreadMessages } = get();
        const currentMessages = currentThreadMessages[messageId] || [];

        // 🚀 PERFORMANCE: Smart merge to preserve optimistic updates
        const firestoreMessages: ThreadMessage[] = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate() || new Date(),
            editedAt: data.editedAt?.toDate()
          } as ThreadMessage;
        });

        // Merge optimistic messages with Firestore messages
        const optimisticMessages = currentMessages.filter(msg => msg.id.startsWith('temp_'));
        const finalMessages = [...firestoreMessages, ...optimisticMessages]
          .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

        // 🔥 INSTANT UPDATE: Use requestAnimationFrame for smooth UI updates
        requestAnimationFrame(() => {
          set({
            threadMessages: {
              ...get().threadMessages,
              [messageId]: finalMessages
            }
          });
        });
      }, (error) => {
        console.error('❌ [THREAD] Thread subscription error:', error);
      });

      const { unsubscribeThreads } = get();
      set({
        unsubscribeThreads: {
          ...unsubscribeThreads,
          [messageId]: unsubscribe
        }
      });
    } catch (error) {
      console.error('❌ [THREAD] Failed to subscribe to thread:', error);
    }
  },

  unsubscribeFromThread: (messageId) => {
    const { unsubscribeThreads } = get();
    const unsubscribe = unsubscribeThreads[messageId];

    if (unsubscribe) {
      unsubscribe();
      const newUnsubscribeThreads = { ...unsubscribeThreads };
      delete newUnsubscribeThreads[messageId];
      set({ unsubscribeThreads: newUnsubscribeThreads });
    }
  },

  setThreadInput: (input) => set({ threadInput: input }),
  setThreadName: (name) => set({ threadName: name }),

  // Utility functions
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error })
}));
