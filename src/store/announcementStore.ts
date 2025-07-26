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
import { Announcement, MessageReaction } from '../types';
import { useAuthStore } from './authStore';
import { announcementReadService } from '../services/announcementReadService';

interface AnnouncementState {
  // State
  announcements: Record<string, Announcement[]>; // communityId -> announcements
  loading: boolean;
  error: string | null;
  readAnnouncementIds: Record<string, string[]>; // communityId -> read announcement IDs
  unreadCounts: Record<string, number>; // communityId -> unread count

  // Subscriptions
  unsubscribeAnnouncements: Record<string, () => void>; // communityId -> unsubscribe function
  unsubscribeReadStatus: Record<string, () => void>; // communityId -> read status unsubscribe function

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
  markAnnouncementAsRead: (communityId: string, announcementId: string) => Promise<void>;
  markAllAnnouncementsAsRead: (communityId: string) => Promise<void>;
  getUnreadCount: (communityId: string) => number;
  isAnnouncementRead: (communityId: string, announcementId: string) => boolean;
  subscribeToReadStatus: (communityId: string) => void;
  unsubscribeFromReadStatus: (communityId: string) => void;

  // Cleanup
  unsubscribeAll: () => void;
  
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
  loading: false,
  error: null,
  readAnnouncementIds: {},
  unreadCounts: {},
  unsubscribeAnnouncements: {},
  unsubscribeReadStatus: {},

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

      if (!user) {
        console.warn('⚠️ [ANNOUNCEMENTS] User not authenticated, cannot load announcements');
        set({ loading: false, error: 'User not authenticated' });
        return;
      }

      // SECURITY FIX: Verify community membership before loading announcements
      const { useCommunityStore } = await import('./communityStore');
      const { isUserMemberOfCommunity, checkMembershipDirect } = useCommunityStore.getState();

      // Check membership using both store and direct Firestore query
      const isMemberInStore = isUserMemberOfCommunity(communityId);
      const isMemberDirect = await checkMembershipDirect(communityId);

      console.log('🔒 [ANNOUNCEMENTS] Membership validation:', {
        communityId,
        userId: user.uid,
        isMemberInStore,
        isMemberDirect
      });

      if (!isMemberInStore && !isMemberDirect) {
        console.warn('⚠️ [ANNOUNCEMENTS] User is not a member of this community, blocking announcement access');
        set({
          loading: false,
          error: 'Access denied: You must be a member of this community to view announcements',
          announcements: {
            ...get().announcements,
            [communityId]: [] // Clear any cached announcements for this community
          }
        });
        return;
      }

      set({ loading: true, error: null });

      // First, load existing announcements from Firestore with error handling
      const announcementsRef = collection(db, 'communities', communityId, 'announcements');
      console.log('📋 [ANNOUNCEMENTS] Firestore collection path:', `communities/${communityId}/announcements`);

      const q = query(
        announcementsRef,
        orderBy('isPinned', 'desc'),
        orderBy('createdAt', 'desc')
      );

      console.log('🔍 [ANNOUNCEMENTS] Executing Firestore query...');

      let snapshot;
      try {
        snapshot = await getDocs(q);
        console.log('✅ [ANNOUNCEMENTS] Query executed successfully, documents found:', snapshot.size);
      } catch (firestoreError: any) {
        console.error('❌ [ANNOUNCEMENTS] Firestore query failed:', firestoreError);

        // Handle specific Firestore errors
        if (firestoreError.code === 'permission-denied') {
          throw new Error('Access denied: You do not have permission to view announcements for this community');
        } else if (firestoreError.code === 'unavailable') {
          throw new Error('Service temporarily unavailable. Please try again later.');
        } else if (firestoreError.code === 'failed-precondition') {
          throw new Error('Database connection error. Please check your internet connection.');
        } else {
          throw new Error(`Failed to load announcements: ${firestoreError.message}`);
        }
      }
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

      // Then subscribe to real-time updates
      get().subscribeToAnnouncements(communityId);
      
      // Subscribe to read status
      get().subscribeToReadStatus(communityId);

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
  // Subscribe to real-time announcements updates
  subscribeToAnnouncements: async (communityId) => {
    console.log('🔌 [ANNOUNCEMENTS] Subscribing to announcements for community:', communityId);

    // SECURITY FIX: Verify membership before subscribing
    const { user } = useAuthStore.getState();
    if (!user) {
      console.warn('⚠️ [ANNOUNCEMENTS] User not authenticated, cannot subscribe to announcements');
      return;
    }

    const { useCommunityStore } = await import('./communityStore');
    const { isUserMemberOfCommunity } = useCommunityStore.getState();

    if (!isUserMemberOfCommunity(communityId)) {
      console.warn('⚠️ [ANNOUNCEMENTS] User is not a member of this community, blocking subscription');
      return;
    }

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
    }, (error) => {
      console.error('❌ [ANNOUNCEMENTS] Real-time subscription error:', error);

      // Handle subscription errors gracefully
      if (error.code === 'permission-denied') {
        console.warn('⚠️ [ANNOUNCEMENTS] Permission denied for real-time updates, clearing announcements');
        // Clear announcements for this community
        const { announcements: currentAnnouncements } = get();
        set({
          announcements: {
            ...currentAnnouncements,
            [communityId]: []
          },
          error: 'Access denied: You do not have permission to view announcements for this community'
        });
      } else {
        set({ error: `Real-time updates failed: ${error.message}` });
      }

      // Unsubscribe on error to prevent repeated failures
      const { unsubscribeAnnouncements } = get();
      if (unsubscribeAnnouncements[communityId]) {
        unsubscribeAnnouncements[communityId]();
        const newUnsubscribe = { ...unsubscribeAnnouncements };
        delete newUnsubscribe[communityId];
        set({ unsubscribeAnnouncements: newUnsubscribe });
      }
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

  // Read tracking methods
  markAnnouncementAsRead: async (communityId, announcementId) => {
    await announcementReadService.markAnnouncementAsRead(communityId, announcementId);
  },

  markAllAnnouncementsAsRead: async (communityId) => {
    const { announcements } = get();
    const communityAnnouncements = announcements[communityId] || [];
    const announcementIds = communityAnnouncements.map(a => a.id);
    await announcementReadService.markAllAnnouncementsAsRead(communityId, announcementIds);
  },

  getUnreadCount: (communityId) => {
    const { unreadCounts } = get();
    return unreadCounts[communityId] || 0;
  },

  isAnnouncementRead: (communityId, announcementId) => {
    const { readAnnouncementIds } = get();
    const readIds = readAnnouncementIds[communityId] || [];
    return readIds.includes(announcementId);
  },

  subscribeToReadStatus: (communityId) => {
    console.log('🔌 [ANNOUNCEMENTS] Subscribing to read status for community:', communityId);
    
    const { unsubscribeReadStatus } = get();
    
    // Unsubscribe from existing subscription if any
    if (unsubscribeReadStatus[communityId]) {
      unsubscribeReadStatus[communityId]();
    }
    
    const unsubscribe = announcementReadService.subscribeToReadStatus(communityId, (readIds) => {
      console.log('📖 [ANNOUNCEMENTS] Read status update for community:', communityId, 'Read IDs:', readIds.length);
      
      const { announcements, readAnnouncementIds, unreadCounts } = get();
      const communityAnnouncements = announcements[communityId] || [];
      
      // Calculate unread count
      const unreadCount = communityAnnouncements.filter(announcement => 
        !readIds.includes(announcement.id)
      ).length;
      
      set({
        readAnnouncementIds: {
          ...readAnnouncementIds,
          [communityId]: readIds
        },
        unreadCounts: {
          ...unreadCounts,
          [communityId]: unreadCount
        },
        unsubscribeReadStatus: {
          ...unsubscribeReadStatus,
          [communityId]: unsubscribe
        }
      });
    });
  },

  unsubscribeFromReadStatus: (communityId) => {
    console.log('🔌 [ANNOUNCEMENTS] Unsubscribing from read status for community:', communityId);
    
    const { unsubscribeReadStatus } = get();
    
    if (unsubscribeReadStatus[communityId]) {
      unsubscribeReadStatus[communityId]();
      const newUnsubscribe = { ...unsubscribeReadStatus };
      delete newUnsubscribe[communityId];
      set({ unsubscribeReadStatus: newUnsubscribe });
    }
    
    announcementReadService.unsubscribeFromCommunity(communityId);
  },

  // Utility functions
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  // CRITICAL FIX: Cleanup all subscriptions on logout
  unsubscribeAll: () => {
    console.log('🧹 [ANNOUNCEMENTS] Unsubscribing from all announcement listeners...');
    const { unsubscribeAnnouncements, unsubscribeReadStatus } = get();

    // Unsubscribe from announcement listeners
    Object.keys(unsubscribeAnnouncements).forEach(communityId => {
      try {
        unsubscribeAnnouncements[communityId]();
        console.log(`✅ [ANNOUNCEMENTS] Unsubscribed from community: ${communityId}`);
      } catch (error) {
        console.warn(`⚠️ [ANNOUNCEMENTS] Error unsubscribing from ${communityId}:`, error);
      }
    });

    // Unsubscribe from read status listeners
    Object.keys(unsubscribeReadStatus).forEach(communityId => {
      try {
        unsubscribeReadStatus[communityId]();
        console.log(`✅ [ANNOUNCEMENTS] Unsubscribed from read status: ${communityId}`);
      } catch (error) {
        console.warn(`⚠️ [ANNOUNCEMENTS] Error unsubscribing from read status ${communityId}:`, error);
      }
    });

    // Cleanup announcement read service
    announcementReadService.unsubscribeAll();

    // Clear all subscriptions and reset state
    set({
      unsubscribeAnnouncements: {},
      unsubscribeReadStatus: {},
      announcements: {},
      readAnnouncementIds: {},
      unreadCounts: {},
      error: null
    });

    console.log('✅ [ANNOUNCEMENTS] All listeners cleaned up');
  }
}));
