import { create } from 'zustand';
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  setDoc,
  getDoc,
  where,
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Announcement, AnnouncementReads, MessageReaction } from '../types';
import { useAuthStore } from './authStore';

interface AnnouncementState {
  // State
  announcements: Record<string, Announcement[]>; // communityId -> announcements
  unreadCounts: Record<string, number>; // communityId -> unread count
  loading: boolean;
  error: string | null;

  // Subscriptions
  unsubscribeAnnouncements: Record<string, () => void>; // communityId -> unsubscribe function

  // Actions
  loadAnnouncements: (communityId: string) => Promise<void>;
  createAnnouncement: (communityId: string, data: {
    title: string;
    content: string;
    isPinned?: boolean;
    isImportant?: boolean;
  }) => Promise<void>;
  updateAnnouncement: (communityId: string, announcementId: string, data: Partial<Announcement>) => Promise<void>;
  deleteAnnouncement: (communityId: string, announcementId: string) => Promise<void>;
  toggleAnnouncementReaction: (communityId: string, announcementId: string, emoji: string) => Promise<void>;
  
  // Read tracking
  markAnnouncementsAsRead: (communityId: string) => Promise<void>;
  getUnreadCount: (communityId: string) => Promise<number>;
  
  // Real-time subscriptions
  subscribeToAnnouncements: (communityId: string) => void;
  unsubscribeFromAnnouncements: (communityId: string) => void;
  
  // Utility
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAnnouncementStore = create<AnnouncementState>((set, get) => ({
  // Initial state
  announcements: {},
  unreadCounts: {},
  loading: false,
  error: null,
  unsubscribeAnnouncements: {},

  // Load announcements for a community
  loadAnnouncements: async (communityId) => {
    try {
      console.log('📢 [ANNOUNCEMENTS] Loading announcements for community:', communityId);

      // Debug authentication state
      const { user } = useAuthStore.getState();
      console.log('🔐 [ANNOUNCEMENTS] User authentication state:', {
        isAuthenticated: !!user,
        userId: user?.uid,
        userEmail: user?.email
      });

      set({ loading: true, error: null });

      // First, load existing announcements from Firestore
      const announcementsRef = collection(db, 'communities', communityId, 'announcements');
      console.log('📋 [ANNOUNCEMENTS] Firestore collection path:', `communities/${communityId}/announcements`);

      const q = query(
        announcementsRef,
        orderBy('isPinned', 'desc'),
        orderBy('createdAt', 'desc')
      );

      console.log('🔍 [ANNOUNCEMENTS] Executing Firestore query...');
      const snapshot = await getDocs(q);
      console.log('✅ [ANNOUNCEMENTS] Query executed successfully, documents found:', snapshot.size);
      const announcements: Announcement[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        announcements.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate()
        } as Announcement);
      });

      console.log('📢 [ANNOUNCEMENTS] Loaded', announcements.length, 'existing announcements');

      // Update store with loaded announcements
      const { announcements: currentAnnouncements } = get();
      set({
        announcements: {
          ...currentAnnouncements,
          [communityId]: announcements
        }
      });

      // Calculate and set initial unread count
      const unreadCount = await get().getUnreadCount(communityId);
      set({
        unreadCounts: {
          ...get().unreadCounts,
          [communityId]: unreadCount
        }
      });

      // Then subscribe to real-time updates
      get().subscribeToAnnouncements(communityId);

      set({ loading: false });
    } catch (error) {
      console.error('❌ [ANNOUNCEMENTS] Failed to load announcements:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load announcements',
        loading: false
      });
    }
  },

  // Create new announcement (admin only)
  createAnnouncement: async (communityId, data) => {
    try {
      console.log('📢 [ANNOUNCEMENTS] Creating announcement:', data);

      const { useAuthStore } = await import('./authStore');
      const { user } = useAuthStore.getState();

      if (!user) {
        throw new Error('User not authenticated');
      }

      const announcementsRef = collection(db, 'communities', communityId, 'announcements');
      const announcementData = {
        communityId,
        title: data.title,
        content: data.content,
        authorId: user.uid,
        authorName: user.displayName || 'Anonymous',
        authorAvatar: user.photoURL || '',
        isPinned: data.isPinned || false,
        isImportant: data.isImportant || false,
        reactions: [],
        createdAt: serverTimestamp()
      };

      await addDoc(announcementsRef, announcementData);
      console.log('✅ [ANNOUNCEMENTS] Announcement created successfully');
    } catch (error) {
      console.error('❌ [ANNOUNCEMENTS] Failed to create announcement:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to create announcement' });
    }
  },

  // Update announcement (admin only)
  updateAnnouncement: async (communityId, announcementId, data) => {
    try {
      console.log('📢 [ANNOUNCEMENTS] Updating announcement:', announcementId, data);

      const announcementRef = doc(db, 'communities', communityId, 'announcements', announcementId);
      await updateDoc(announcementRef, {
        ...data,
        updatedAt: serverTimestamp()
      });

      console.log('✅ [ANNOUNCEMENTS] Announcement updated successfully');
    } catch (error) {
      console.error('❌ [ANNOUNCEMENTS] Failed to update announcement:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to update announcement' });
    }
  },

  // Delete announcement (admin only)
  deleteAnnouncement: async (communityId, announcementId) => {
    try {
      console.log('📢 [ANNOUNCEMENTS] Deleting announcement:', announcementId);

      const announcementRef = doc(db, 'communities', communityId, 'announcements', announcementId);
      await deleteDoc(announcementRef);

      console.log('✅ [ANNOUNCEMENTS] Announcement deleted successfully');
    } catch (error) {
      console.error('❌ [ANNOUNCEMENTS] Failed to delete announcement:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to delete announcement' });
    }
  },

  // Toggle emoji reaction on announcement
  toggleAnnouncementReaction: async (communityId, announcementId, emoji) => {
    try {
      console.log('😊 [ANNOUNCEMENTS] Toggling reaction:', announcementId, emoji);

      const { useAuthStore } = await import('./authStore');
      const { user } = useAuthStore.getState();

      if (!user) {
        throw new Error('User not authenticated');
      }

      // Find the announcement
      const { announcements } = get();
      const communityAnnouncements = announcements[communityId] || [];
      const announcement = communityAnnouncements.find(a => a.id === announcementId);

      if (!announcement) {
        throw new Error('Announcement not found');
      }

      const reactions = announcement.reactions || [];
      const existingReaction = reactions.find(r => r.emoji === emoji);

      let updatedReactions: MessageReaction[];
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
      const updatedAnnouncements = communityAnnouncements.map(a =>
        a.id === announcementId
          ? { ...a, reactions: updatedReactions }
          : a
      );

      set({
        announcements: {
          ...announcements,
          [communityId]: updatedAnnouncements
        }
      });

      // 🔥 BACKGROUND: Update Firestore
      const announcementRef = doc(db, 'communities', communityId, 'announcements', announcementId);
      await updateDoc(announcementRef, { reactions: updatedReactions });

      console.log('✅ [ANNOUNCEMENTS] Reaction toggled successfully');
    } catch (error) {
      console.error('❌ [ANNOUNCEMENTS] Failed to toggle reaction:', error);
      set({ error: error instanceof Error ? error.message : 'Failed to toggle reaction' });
    }
  },

  // Mark announcements as read for current user
  markAnnouncementsAsRead: async (communityId) => {
    try {
      console.log('👁️ [ANNOUNCEMENTS] Marking announcements as read for community:', communityId);

      const { useAuthStore } = await import('./authStore');
      const { user } = useAuthStore.getState();

      if (!user) {
        throw new Error('User not authenticated');
      }

      const { announcements } = get();
      const communityAnnouncements = announcements[communityId] || [];
      const announcementIds = communityAnnouncements.map(a => a.id);

      const readRef = doc(db, 'communities', communityId, 'announcementReads', user.uid);
      await setDoc(readRef, {
        userId: user.uid,
        communityId,
        lastReadTimestamp: serverTimestamp(),
        readAnnouncementIds: announcementIds,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Immediately set unread count to 0 for instant UI feedback
      set({
        unreadCounts: {
          ...get().unreadCounts,
          [communityId]: 0
        }
      });

      console.log('✅ [ANNOUNCEMENTS] Marked announcements as read, unread count set to 0');

      // Also recalculate to ensure accuracy (in case user created announcements)
      setTimeout(async () => {
        const newUnreadCount = await get().getUnreadCount(communityId);
        set({
          unreadCounts: {
            ...get().unreadCounts,
            [communityId]: newUnreadCount
          }
        });
        console.log('🔄 [ANNOUNCEMENTS] Recalculated unread count:', newUnreadCount);
      }, 100);
    } catch (error) {
      console.error('❌ [ANNOUNCEMENTS] Failed to mark announcements as read:', error);
    }
  },

  // Get unread count for a community
  getUnreadCount: async (communityId) => {
    try {
      const { useAuthStore } = await import('./authStore');
      const { user } = useAuthStore.getState();

      if (!user) return 0;

      const { announcements } = get();
      const communityAnnouncements = announcements[communityId] || [];

      // Get user's read status
      const readRef = doc(db, 'communities', communityId, 'announcementReads', user.uid);
      const readDoc = await getDoc(readRef);

      if (!readDoc.exists()) {
        // User has never read announcements, count all except their own
        const unreadAnnouncements = communityAnnouncements.filter(announcement =>
          announcement.authorId !== user.uid
        );
        return unreadAnnouncements.length;
      }

      const readData = readDoc.data() as AnnouncementReads;
      const lastReadTimestamp = readData.lastReadTimestamp;
      const readIds = readData.readAnnouncementIds || [];

      // Count announcements created after last read timestamp or not in read IDs
      // BUT exclude announcements created by the current user
      const unreadCount = communityAnnouncements.filter(announcement => {
        // Don't show badges for announcements the user created
        if (announcement.authorId === user.uid) {
          return false;
        }

        const isAfterLastRead = announcement.createdAt > lastReadTimestamp;
        const isNotInReadIds = !readIds.includes(announcement.id);
        return isAfterLastRead || isNotInReadIds;
      }).length;

      console.log('📊 [ANNOUNCEMENTS] Unread count calculation:', {
        communityId,
        userId: user.uid,
        totalAnnouncements: communityAnnouncements.length,
        userCreatedAnnouncements: communityAnnouncements.filter(a => a.authorId === user.uid).length,
        unreadCount,
        lastReadTimestamp,
        readIds: readIds.length
      });

      return unreadCount;
    } catch (error) {
      console.error('❌ [ANNOUNCEMENTS] Failed to get unread count:', error);
      return 0;
    }
  },

  // Subscribe to real-time announcements updates
  subscribeToAnnouncements: (communityId) => {
    console.log('🔌 [ANNOUNCEMENTS] Subscribing to announcements for community:', communityId);

    const { unsubscribeAnnouncements } = get();

    // Unsubscribe from existing subscription if any
    if (unsubscribeAnnouncements[communityId]) {
      unsubscribeAnnouncements[communityId]();
    }

    const announcementsRef = collection(db, 'communities', communityId, 'announcements');
    const q = query(
      announcementsRef,
      orderBy('isPinned', 'desc'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const announcements: Announcement[] = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        announcements.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate()
        } as Announcement);
      });

      console.log('📢 [ANNOUNCEMENTS] Real-time update:', announcements.length, 'announcements');

      const { announcements: currentAnnouncements } = get();
      set({
        announcements: {
          ...currentAnnouncements,
          [communityId]: announcements
        }
      });

      // Update unread count
      get().getUnreadCount(communityId).then(count => {
        set({
          unreadCounts: {
            ...get().unreadCounts,
            [communityId]: count
          }
        });
      });
    }, (error) => {
      console.error('❌ [ANNOUNCEMENTS] Real-time subscription error:', error);
      set({ error: error.message });
    });

    set({
      unsubscribeAnnouncements: {
        ...unsubscribeAnnouncements,
        [communityId]: unsubscribe
      }
    });
  },

  // Unsubscribe from announcements updates
  unsubscribeFromAnnouncements: (communityId) => {
    console.log('🔌 [ANNOUNCEMENTS] Unsubscribing from announcements for community:', communityId);

    const { unsubscribeAnnouncements } = get();

    if (unsubscribeAnnouncements[communityId]) {
      unsubscribeAnnouncements[communityId]();
      delete unsubscribeAnnouncements[communityId];
      set({ unsubscribeAnnouncements });
    }
  },

  // Utility functions
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error })
}));
