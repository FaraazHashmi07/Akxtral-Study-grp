import { create } from 'zustand';
import {
  Community,
  CommunityMember,
  JoinRequest,
  CommunityAnalytics,
  CommunityFilter
} from '../types';
import * as communityService from '../services/communityService';
import { useAuthStore } from './authStore';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface CommunityState {
  // State
  communities: Community[];
  joinedCommunities: Community[];
  activeCommunity: Community | null;
  communityMembers: Record<string, CommunityMember[]>;
  joinRequests: JoinRequest[];
  analytics: Record<string, CommunityAnalytics>;
  loading: boolean;
  error: string | null;

  // Performance optimization
  lastLoadedUserId: string | null;
  lastLoadTime: number;

  // Actions
  loadCommunities: () => Promise<void>;
  loadJoinedCommunities: (forceRefresh?: boolean) => Promise<void>;
  setActiveCommunity: (community: Community | null) => void;
  createCommunity: (data: Partial<Community>) => Promise<Community>;
  updateCommunity: (id: string, updates: Partial<Community>) => Promise<void>;
  deleteCommunity: (id: string) => Promise<void>;
  
  // Membership
  joinCommunity: (communityId: string, message?: string) => Promise<void>;
  leaveCommunity: (communityId: string) => Promise<void>;
  loadCommunityMembers: (communityId: string) => Promise<void>;
  updateMemberRole: (communityId: string, userId: string, role: 'community_admin' | 'community_member') => Promise<void>;
  removeMember: (communityId: string, userId: string) => Promise<void>;
  
  // Join Requests
  loadJoinRequests: (communityId: string) => Promise<void>;
  approveJoinRequest: (requestId: string) => Promise<void>;
  rejectJoinRequest: (requestId: string) => Promise<void>;
  
  // Discovery
  searchCommunities: (query: string, filters?: CommunityFilter) => Promise<Community[]>;
  discoverCommunities: (filters?: CommunityFilter) => Promise<Community[]>;
  isUserMemberOfCommunity: (communityId: string) => boolean;
  checkMembershipDirect: (communityId: string) => Promise<boolean>;
  
  // Analytics
  loadCommunityAnalytics: (communityId: string) => Promise<void>;

  // Cleanup
  reset: () => void;
}

export const useCommunityStore = create<CommunityState>((set, get) => ({
  // Initial state
  communities: [],
  joinedCommunities: [],
  activeCommunity: null,
  communityMembers: {},
  joinRequests: [],
  analytics: {},
  loading: false,
  error: null,
  lastLoadedUserId: null,
  lastLoadTime: 0,

  // Load all public communities for discovery
  loadCommunities: async () => {
    console.log('🏪 Loading communities for discovery...');
    set({ loading: true, error: null });
    try {
      const communities = await communityService.getAllPublicCommunities();
      console.log('✅ Communities loaded successfully:', {
        count: communities.length,
        communities: communities.map(c => ({ name: c.name, id: c.id, visibility: c.visibility }))
      });
      set({ communities, loading: false });
    } catch (error) {
      console.error('❌ Failed to load communities:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load communities',
        loading: false
      });
    }
  },

  // Load communities the user has joined with caching
  loadJoinedCommunities: async (forceRefresh = false) => {
    const { lastLoadedUserId, lastLoadTime, loading } = get();
    const authState = useAuthStore.getState();
    const user = authState.user;

    if (!user) {
      console.log('👤 [STORE] No user found, clearing joined communities');
      set({
        joinedCommunities: [],
        loading: false,
        lastLoadedUserId: null,
        lastLoadTime: 0,
        error: null // Clear any previous errors
      });
      return;
    }

    // CRITICAL FIX: Prevent loading during signout process
    if (authState.loading) {
      return;
    }

    // Performance optimization: Skip if already loading for same user
    if (loading && lastLoadedUserId === user.uid) {
      return;
    }

    // Cache check: Skip if recently loaded for same user (within 30 seconds)
    const now = Date.now();
    const cacheValidTime = 30 * 1000; // 30 seconds
    if (!forceRefresh &&
        lastLoadedUserId === user.uid &&
        (now - lastLoadTime) < cacheValidTime) {
      return;
    }

    set({ loading: true, error: null });
    try {
      const joinedCommunities = await communityService.getUserCommunities(user.uid);

      // Only update if we still have the same user (prevent race conditions)
      const currentUser = useAuthStore.getState().user;
      if (currentUser && currentUser.uid === user.uid) {
        set({
          joinedCommunities,
          loading: false,
          lastLoadedUserId: user.uid,
          lastLoadTime: now
        });
      } else {
        console.log('⚠️ [STORE] User changed during load, discarding results');
        set({
          joinedCommunities: [],
          loading: false,
          lastLoadedUserId: null,
          lastLoadTime: 0
        });
      }
    } catch (error) {
      console.error('❌ [STORE] Failed to load joined communities:', error);
      set({
        joinedCommunities: [], // Clear on error to prevent stale data
        error: error instanceof Error ? error.message : 'Failed to load joined communities',
        loading: false,
        lastLoadedUserId: null,
        lastLoadTime: 0
      });
    }
  },

  // Set the currently active community
  setActiveCommunity: (community) => {
    set({ activeCommunity: community });
    if (community) {
      // Load community-specific data when a community is selected
      get().loadCommunityMembers(community.id);
      get().loadCommunityAnalytics(community.id);
    }
  },

  // Create a new community
  createCommunity: async (data) => {
    console.log('🏗️ Creating new community:', data);
    set({ loading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        console.error('❌ User not authenticated');
        throw new Error('User not authenticated');
      }

      console.log('👤 Creating community for user:', user.uid);

      // Prepare creator display name with better fallback
      let creatorDisplayName = user.displayName;
      if (!creatorDisplayName && user.email) {
        creatorDisplayName = user.email.split('@')[0];
        creatorDisplayName = creatorDisplayName.charAt(0).toUpperCase() + creatorDisplayName.slice(1);
      }
      if (!creatorDisplayName) {
        creatorDisplayName = 'Community Creator';
      }

      const community = await communityService.createCommunity(
        data,
        user.uid,
        user.email,
        creatorDisplayName
      );
      console.log('✅ Community created successfully:', community);

      const { joinedCommunities } = get();
      set({
        joinedCommunities: [...joinedCommunities, community],
        activeCommunity: community,
        loading: false
      });

      console.log('🎉 Community added to user\'s joined communities');
      return community;
    } catch (error) {
      console.error('❌ Failed to create community:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to create community',
        loading: false
      });
      throw error;
    }
  },

  // Update community details
  updateCommunity: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Call the community service to update in Firestore
      await communityService.updateCommunity(id, updates, user.uid);
      
      const { communities, joinedCommunities, activeCommunity } = get();
      
      const updateCommunityInArray = (communities: Community[]) =>
        communities.map(c => c.id === id ? { ...c, ...updates } : c);
      
      set({
        communities: updateCommunityInArray(communities),
        joinedCommunities: updateCommunityInArray(joinedCommunities),
        activeCommunity: activeCommunity?.id === id ? { ...activeCommunity, ...updates } : activeCommunity,
        loading: false
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update community',
        loading: false 
      });
      throw error;
    }
  },

  // Delete a community (admin only)
  deleteCommunity: async (id) => {
    set({ loading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('🗑️ [STORE] Deleting community:', id);
      await communityService.deleteCommunity(id, user.uid);

      const { communities, joinedCommunities, activeCommunity } = get();

      set({
        communities: communities.filter(c => c.id !== id),
        joinedCommunities: joinedCommunities.filter(c => c.id !== id),
        activeCommunity: activeCommunity?.id === id ? null : activeCommunity,
        loading: false
      });

      console.log('✅ [STORE] Community deleted successfully');
    } catch (error) {
      console.error('❌ [STORE] Failed to delete community:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to delete community',
        loading: false
      });
      throw error;
    }
  },

  // Join a community (may require approval)
  joinCommunity: async (communityId, message) => {
    set({ loading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('🤝 [STORE] Joining community:', communityId, 'for user:', user.uid);

      // Prepare user display name with better fallback
      let userDisplayName = user.displayName;
      if (!userDisplayName && user.email) {
        userDisplayName = user.email.split('@')[0];
        userDisplayName = userDisplayName.charAt(0).toUpperCase() + userDisplayName.slice(1);
      }
      if (!userDisplayName) {
        userDisplayName = 'Community Member';
      }

      await communityService.joinCommunity(
        communityId,
        user.uid,
        message,
        userDisplayName,
        user.email || ''
      );

      console.log('✅ [STORE] Join community service call completed successfully');

      // Optimized: Refresh both communities and roles in parallel for better performance
      console.log('🔄 [STORE] Refreshing communities and roles after join...');
      const [_, __] = await Promise.all([
        get().loadJoinedCommunities(true), // Force refresh communities
        useAuthStore.getState().refreshCommunityRoles() // Refresh roles
      ]);

      // Log the updated state for debugging
      const { joinedCommunities } = get();
      console.log('📋 [STORE] Updated joined communities:', joinedCommunities.map(c => c.name));

      console.log('✅ [STORE] Join community process completed');
      set({ loading: false });
    } catch (error) {
      console.error('❌ [STORE] Failed to join community:', error);

      // Always reload communities to ensure UI reflects actual backend state
      // This handles cases where the operation partially succeeded
      try {
        console.log('🔄 [STORE] Reloading communities after error to sync state...');
        // Only reload communities on error, skip roles refresh to save time
        await get().loadJoinedCommunities(true); // Force refresh
      } catch (reloadError) {
        console.warn('⚠️ [STORE] Failed to reload communities after error:', reloadError);
      }

      set({
        error: error instanceof Error ? error.message : 'Failed to join community',
        loading: false
      });
      throw error;
    }
  },

  // Leave a community
  leaveCommunity: async (communityId) => {
    set({ loading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        throw new Error('User not authenticated');
      }

      await communityService.leaveCommunity(communityId, user.uid);

      const { joinedCommunities, activeCommunity } = get();

      set({
        joinedCommunities: joinedCommunities.filter(c => c.id !== communityId),
        activeCommunity: activeCommunity?.id === communityId ? null : activeCommunity,
        loading: false
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to leave community',
        loading: false
      });
      throw error;
    }
  },

  // Load members of a specific community
  loadCommunityMembers: async (communityId) => {
    try {
      const members = await communityService.getCommunityMembers(communityId);

      const { communityMembers } = get();
      set({
        communityMembers: {
          ...communityMembers,
          [communityId]: members
        }
      });
    } catch (error) {
      console.error('Failed to load community members:', error);
    }
  },

  // Update a member's role (admin only)
  updateMemberRole: async (communityId, userId, role) => {
    try {
      // TODO: Implement Firestore member role update
      // await updateMemberRoleInFirestore(communityId, userId, role);
      
      const { communityMembers } = get();
      const members = communityMembers[communityId] || [];
      
      set({
        communityMembers: {
          ...communityMembers,
          [communityId]: members.map(m => 
            m.uid === userId ? { ...m, role } : m
          )
        }
      });
    } catch (error) {
      console.error('Failed to update member role:', error);
    }
  },

  // Remove a member from community (admin only)
  removeMember: async (communityId, userId) => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Use the service function to remove member
      await communityService.removeCommunityMember(communityId, userId, user.uid);

      // Update local state
      const { communityMembers } = get();
      const members = communityMembers[communityId] || [];

      set({
        communityMembers: {
          ...communityMembers,
          [communityId]: members.filter(m => m.uid !== userId)
        }
      });
    } catch (error) {
      console.error('Failed to remove member:', error);
      throw error;
    }
  },

  // Load join requests for a community (admin only)
  loadJoinRequests: async (communityId) => {
    try {
      const requests = await communityService.getJoinRequests(communityId);
      set({ joinRequests: requests });
    } catch (error) {
      console.error('Failed to load join requests:', error);
    }
  },

  // Approve a join request (admin only)
  approveJoinRequest: async (requestId) => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        throw new Error('User not authenticated');
      }

      await communityService.approveJoinRequest(requestId, user.uid);

      const { joinRequests } = get();
      set({
        joinRequests: joinRequests.filter(r => r.id !== requestId)
      });
    } catch (error) {
      console.error('Failed to approve join request:', error);
      throw error;
    }
  },

  // Reject a join request (admin only)
  rejectJoinRequest: async (requestId) => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        throw new Error('User not authenticated');
      }

      await communityService.rejectJoinRequest(requestId, user.uid);

      const { joinRequests } = get();
      set({
        joinRequests: joinRequests.filter(r => r.id !== requestId)
      });
    } catch (error) {
      console.error('Failed to reject join request:', error);
      throw error;
    }
  },

  // Search communities with filters
  searchCommunities: async (query, filters) => {
    try {
      const results = await communityService.getCommunities(filters);

      // Filter by search query on the client side
      // In a production app, you'd want to implement full-text search on the server
      const filteredResults = results.filter(community =>
        community.name.toLowerCase().includes(query.toLowerCase()) ||
        community.description.toLowerCase().includes(query.toLowerCase()) ||
        community.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
      );

      return filteredResults;
    } catch (error) {
      console.error('Failed to search communities:', error);
      return [];
    }
  },

  // Check if user is a member of a community
  isUserMemberOfCommunity: (communityId: string): boolean => {
    const { joinedCommunities, loading } = get();

    // If still loading, be conservative and assume not a member
    // This prevents false positives during initial load
    if (loading) {
      console.log('⏳ [STORE] Still loading memberships, assuming not a member for:', communityId);
      return false;
    }

    // Additional safety check - ensure joinedCommunities is an array
    if (!Array.isArray(joinedCommunities)) {
      console.warn('⚠️ [STORE] joinedCommunities is not an array:', joinedCommunities);
      return false;
    }

    const isMember = joinedCommunities.some(community => community && community.id === communityId);
    console.log('🔍 [STORE] Checking membership for community:', communityId, 'Result:', isMember);
    console.log('🔍 [STORE] User\'s joined communities:', joinedCommunities.map(c => c?.id || 'undefined'));
    return isMember;
  },

  // Immediate membership check using Firestore (for critical operations)
  checkMembershipDirect: async (communityId: string): Promise<boolean> => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) return false;

      // Check role document directly - this is the most reliable method
      const roleRef = doc(db, 'communities', communityId, 'roles', user.uid);
      const roleSnap = await getDoc(roleRef);

      const isMember = roleSnap.exists();
      console.log('🔍 [STORE] Direct membership check for:', communityId, 'Result:', isMember);
      return isMember;
    } catch (error) {
      console.error('❌ [STORE] Failed direct membership check:', error);
      return false;
    }
  },

  // Discover communities with filters
  discoverCommunities: async (filters) => {
    console.log('🔍 Discovering communities with filters:', filters);
    try {
      // Always get all public communities first
      const results = await communityService.getAllPublicCommunities();
      console.log('✅ Discovery completed:', results.length, 'public communities found');
      return results;
    } catch (error) {
      console.error('❌ Failed to discover communities:', error);
      return [];
    }
  },

  // Load analytics for a community (admin only)
  loadCommunityAnalytics: async (communityId) => {
    try {
      // TODO: Implement analytics calculation
      // const analytics = await getCommunityAnalytics(communityId);
      const analytics: CommunityAnalytics = {
        communityId,
        memberCount: 0,
        activeMembers: 0,
        messageCount: 0,
        resourceCount: 0,
        eventCount: 0,
        joinRequestCount: 0,
        activityTrend: [],
        topContributors: []
      }; // Placeholder
      
      const { analytics: currentAnalytics } = get();
      set({
        analytics: {
          ...currentAnalytics,
          [communityId]: analytics
        }
      });
    } catch (error) {
      console.error('Failed to load community analytics:', error);
    }
  },

  // CRITICAL FIX: Reset store to prevent data leakage between users
  reset: () => {
    console.log('🧹 [COMMUNITY] Resetting community store...');
    set({
      communities: [],
      joinedCommunities: [],
      activeCommunity: null,
      communityMembers: {},
      joinRequests: [],
      analytics: {},
      loading: false,
      error: null,
      lastLoadedUserId: null,
      lastLoadTime: 0
    });
    console.log('✅ [COMMUNITY] Store reset complete');
  }
}));
