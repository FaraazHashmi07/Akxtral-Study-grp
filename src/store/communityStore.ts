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

  // Actions
  loadCommunities: () => Promise<void>;
  loadJoinedCommunities: () => Promise<void>;
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
  
  // Analytics
  loadCommunityAnalytics: (communityId: string) => Promise<void>;
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

  // Load communities the user has joined
  loadJoinedCommunities: async () => {
    set({ loading: true, error: null });
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        console.log('👤 [STORE] No user found, clearing joined communities');
        set({ joinedCommunities: [], loading: false });
        return;
      }

      console.log('📋 [STORE] Loading joined communities for user:', user.uid);
      const joinedCommunities = await communityService.getUserCommunities(user.uid);
      console.log('✅ [STORE] Loaded joined communities:', joinedCommunities.map(c => c.name));
      set({ joinedCommunities, loading: false });
    } catch (error) {
      console.error('❌ [STORE] Failed to load joined communities:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load joined communities',
        loading: false
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
      // TODO: Implement Firestore community update
      // await updateCommunityInFirestore(id, updates);
      
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

      console.log('🗑️ [STORE] Deleting community:', {
        id,
        idType: typeof id,
        idLength: id?.length,
        userId: user.uid
      });
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

      // Reload joined communities to reflect the change and wait for completion
      console.log('🔄 [STORE] Reloading joined communities after join...');
      await get().loadJoinedCommunities();

      // Log the updated state for debugging
      const { joinedCommunities } = get();
      console.log('📋 [STORE] Updated joined communities:', joinedCommunities.map(c => c.name));

      console.log('✅ [STORE] Join community process completed');
      set({ loading: false });
    } catch (error) {
      console.error('❌ [STORE] Failed to join community:', error);
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
    const { joinedCommunities } = get();
    const isMember = joinedCommunities.some(community => community.id === communityId);
    console.log('🔍 [STORE] Checking membership for community:', communityId, 'Result:', isMember);
    console.log('🔍 [STORE] User\'s joined communities:', joinedCommunities.map(c => c.id));
    return isMember;
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
  }
}));
