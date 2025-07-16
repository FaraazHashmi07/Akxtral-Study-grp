import { create } from 'zustand';
import { 
  SuperAdminUIState, 
  SuperAdminAnalytics, 
  SuperAdminCommunityView, 
  SuperAdminUserView 
} from '../types';

interface SuperAdminStore extends SuperAdminUIState {
  // Data
  analytics: SuperAdminAnalytics | null;
  communities: SuperAdminCommunityView[];
  users: SuperAdminUserView[];
  loading: boolean;
  error: string | null;

  // Actions
  setActiveAdminSection: (section: SuperAdminUIState['activeAdminSection']) => void;
  setCommunitySearchQuery: (query: string) => void;
  setUserSearchQuery: (query: string) => void;
  setSelectedCommunityForView: (communityId: string | null) => void;
  setSelectedUserForView: (userId: string | null) => void;
  setShowDeleteConfirmation: (show: boolean) => void;
  setCommunityToDelete: (communityId: string | null) => void;

  // Data loading
  loadAnalytics: () => Promise<void>;
  loadCommunities: () => Promise<void>;
  loadUsers: () => Promise<void>;
  deleteCommunity: (communityId: string) => Promise<void>;
  deleteCommunitydirect: (communityId: string) => Promise<void>;

  // Utility
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useSuperAdminStore = create<SuperAdminStore>((set, get) => ({
  // UI State
  activeAdminSection: 'dashboard',
  communitySearchQuery: '',
  userSearchQuery: '',
  selectedCommunityForView: null,
  selectedUserForView: null,
  showDeleteConfirmation: false,
  communityToDelete: null,

  // Data
  analytics: null,
  communities: [],
  users: [],
  loading: false,
  error: null,

  // UI Actions
  setActiveAdminSection: (section) => {
    console.log('🔧 [SUPER_ADMIN] Setting active section:', section);
    set({ activeAdminSection: section });
  },

  setCommunitySearchQuery: (query) => set({ communitySearchQuery: query }),
  setUserSearchQuery: (query) => set({ userSearchQuery: query }),
  setSelectedCommunityForView: (communityId) => set({ selectedCommunityForView: communityId }),
  setSelectedUserForView: (userId) => set({ selectedUserForView: userId }),
  setShowDeleteConfirmation: (show) => set({ showDeleteConfirmation: show }),
  setCommunityToDelete: (communityId) => set({ communityToDelete: communityId }),

  // Data Loading Actions
  loadAnalytics: async () => {
    set({ loading: true, error: null });
    try {
      console.log('📊 [SUPER_ADMIN] Loading analytics...');

      // Import Firebase Functions
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const { app } = await import('../lib/firebase');

      const functions = getFunctions(app);

      // Try different function names
      let getSuperAdminAnalytics;
      try {
        // First try the prefixed name
        getSuperAdminAnalytics = httpsCallable(functions, 'super-admin-getSuperAdminAnalytics');
      } catch {
        // Fallback to original name
        getSuperAdminAnalytics = httpsCallable(functions, 'getSuperAdminAnalytics');
      }

      const result = await getSuperAdminAnalytics();
      const analytics = result.data as SuperAdminAnalytics;

      console.log('✅ [SUPER_ADMIN] Analytics loaded:', analytics);
      set({ analytics, loading: false });
    } catch (error) {
      console.error('❌ [SUPER_ADMIN] Failed to load analytics:', error);

      // Try to load data directly from Firestore as fallback
      try {
        console.log('🔄 [SUPER_ADMIN] Trying direct Firestore access...');
        const { collection, getDocs, query, where } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');

        // Get basic counts directly from Firestore
        const communitiesSnapshot = await getDocs(collection(db, 'communities'));
        const totalCommunities = communitiesSnapshot.size;

        // Get communities created this week
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

        const recentCommunitiesSnapshot = await getDocs(
          query(collection(db, 'communities'), where('createdAt', '>=', oneWeekAgo))
        );
        const communitiesCreatedThisWeek = recentCommunitiesSnapshot.size;

        // Get flagged communities
        const flaggedCommunitiesSnapshot = await getDocs(
          query(collection(db, 'communities'), where('flagged', '==', true))
        );
        const flaggedCommunities = flaggedCommunitiesSnapshot.size;

        const fallbackAnalytics: SuperAdminAnalytics = {
          totalUsers: 0, // Can't get from Firestore easily
          totalCommunities,
          communitiesCreatedThisWeek,
          flaggedCommunities,
          storageUsage: 0, // Can't get from Firestore
          topActiveCommunities: []
        };

        console.log('✅ [SUPER_ADMIN] Fallback analytics loaded:', fallbackAnalytics);
        set({ analytics: fallbackAnalytics, loading: false });
      } catch (fallbackError) {
        console.error('❌ [SUPER_ADMIN] Fallback also failed:', fallbackError);

        // Final fallback to empty data
        const emptyAnalytics: SuperAdminAnalytics = {
          totalUsers: 0,
          totalCommunities: 0,
          communitiesCreatedThisWeek: 0,
          flaggedCommunities: 0,
          storageUsage: 0,
          topActiveCommunities: []
        };

        set({
          analytics: emptyAnalytics,
          error: 'Unable to load analytics. Please check Firebase Functions deployment.',
          loading: false
        });
      }
    }
  },

  loadCommunities: async () => {
    set({ loading: true, error: null });
    try {
      console.log('🏢 [SUPER_ADMIN] Loading communities...');

      // Import Firestore
      const { collection, getDocs, query, orderBy } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');

      const communitiesQuery = query(
        collection(db, 'communities'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(communitiesQuery);
      const communities: SuperAdminCommunityView[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name || 'Unknown',
          description: data.description || '',
          creatorEmail: data.creatorEmail || 'Unknown',
          creatorUid: data.createdBy || '',
          createdAt: data.createdAt?.toDate() || new Date(),
          memberCount: data.memberCount || 0,
          resourceCount: data.resourceCount || 0,
          messageCount: data.messageCount || 0,
          eventCount: data.eventCount || 0,
          flagged: data.flagged || false,
          lastActivity: data.lastActivity?.toDate() || new Date()
        };
      });

      set({ communities, loading: false });
    } catch (error) {
      console.error('❌ [SUPER_ADMIN] Failed to load communities:', error);
      set({
        communities: [],
        error: error instanceof Error ? error.message : 'Failed to load communities',
        loading: false
      });
    }
  },

  loadUsers: async () => {
    set({ loading: true, error: null });
    try {
      console.log('👥 [SUPER_ADMIN] Loading users...');

      // Import Firestore
      const { collection, getDocs, query, orderBy } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');

      const usersQuery = query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(usersQuery);
      const users: SuperAdminUserView[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          uid: doc.id,
          email: data.email || 'Unknown',
          displayName: data.displayName || 'Unknown User',
          communitiesCreated: data.communitiesCreated || 0,
          communitiesJoined: data.communitiesJoined || 0,
          registrationDate: data.createdAt?.toDate() || new Date(),
          lastLoginAt: data.lastLoginAt?.toDate() || new Date(),
          flagCount: data.flagCount || 0
        };
      });

      set({ users, loading: false });
    } catch (error) {
      console.error('❌ [SUPER_ADMIN] Failed to load users:', error);
      set({
        users: [],
        error: error instanceof Error ? error.message : 'Failed to load users',
        loading: false
      });
    }
  },

  deleteCommunity: async (communityId: string) => {
    set({ loading: true, error: null });
    try {
      console.log('🗑️ [SUPER_ADMIN] Deleting community:', communityId);

      // Try Firebase Functions first, then fallback to direct Firestore deletion
      try {
        console.log('🔧 [SUPER_ADMIN] Attempting Firebase Functions deletion...');

        // Import Firebase Functions
        const { getFunctions, httpsCallable } = await import('firebase/functions');
        const { app } = await import('../lib/firebase');

        const functions = getFunctions(app);

        // Try the super-admin prefixed function first
        let deleteCommunityRecursively;
        try {
          deleteCommunityRecursively = httpsCallable(functions, 'super-admin-deleteCommunityRecursively');
          console.log('🔧 [SUPER_ADMIN] Trying super-admin-deleteCommunityRecursively...');
        } catch {
          // Fallback to original function name
          deleteCommunityRecursively = httpsCallable(functions, 'deleteCommunityRecursively');
          console.log('🔧 [SUPER_ADMIN] Falling back to deleteCommunityRecursively...');
        }

        const result = await deleteCommunityRecursively({ communityId });
        console.log('✅ [SUPER_ADMIN] Community deleted via Functions:', result.data);

      } catch (functionError) {
        console.warn('⚠️ [SUPER_ADMIN] Functions deletion failed, using direct Firestore deletion:', functionError);

        // Fallback to direct Firestore deletion
        await get().deleteCommunitydirect(communityId);
        console.log('✅ [SUPER_ADMIN] Community deleted via direct Firestore access');
      }

      // Remove from local state
      const currentCommunities = get().communities;
      const updatedCommunities = currentCommunities.filter(c => c.id !== communityId);

      set({
        communities: updatedCommunities,
        loading: false,
        showDeleteConfirmation: false,
        communityToDelete: null
      });
    } catch (error) {
      console.error('❌ [SUPER_ADMIN] Failed to delete community:', error);

      set({
        error: error instanceof Error ? error.message : 'Failed to delete community',
        loading: false,
        showDeleteConfirmation: false,
        communityToDelete: null
      });
    }
  },

  // Direct Firestore deletion as fallback
  deleteCommunitydirect: async (communityId: string) => {
    console.log('🗑️ [SUPER_ADMIN] Starting direct Firestore deletion for:', communityId);

    const { collection, doc, getDocs, deleteDoc, query, limit } = await import('firebase/firestore');
    const { ref, deleteObject, listAll } = await import('firebase/storage');
    const { db, storage } = await import('../lib/firebase');

    // Delete subcollections in batches
    const subcollections = ['messages', 'resources', 'events', 'roles'];

    for (const subcollectionName of subcollections) {
      console.log(`🗑️ [SUPER_ADMIN] Deleting ${subcollectionName} subcollection...`);

      const subcollectionRef = collection(db, 'communities', communityId, subcollectionName);

      // Delete in batches of 100
      let hasMore = true;
      while (hasMore) {
        const snapshot = await getDocs(query(subcollectionRef, limit(100)));

        if (snapshot.empty) {
          hasMore = false;
          break;
        }

        // Delete documents in parallel
        const deletePromises = snapshot.docs.map(docSnapshot => deleteDoc(docSnapshot.ref));
        await Promise.all(deletePromises);

        console.log(`🗑️ [SUPER_ADMIN] Deleted ${snapshot.docs.length} documents from ${subcollectionName}`);
      }
    }

    // Delete storage files
    try {
      console.log('🗑️ [SUPER_ADMIN] Deleting storage files...');
      const storageRef = ref(storage, `resources/${communityId}`);
      const listResult = await listAll(storageRef);

      if (listResult.items.length > 0) {
        const deletePromises = listResult.items.map(itemRef => deleteObject(itemRef));
        await Promise.all(deletePromises);
        console.log(`🗑️ [SUPER_ADMIN] Deleted ${listResult.items.length} storage files`);
      }
    } catch (storageError) {
      console.warn('⚠️ [SUPER_ADMIN] Storage deletion failed (may not exist):', storageError);
      // Continue with deletion even if storage cleanup fails
    }

    // Finally, delete the main community document
    console.log('🗑️ [SUPER_ADMIN] Deleting main community document...');
    const communityRef = doc(db, 'communities', communityId);
    await deleteDoc(communityRef);

    console.log('✅ [SUPER_ADMIN] Direct deletion completed successfully');
  },

  // Utility
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  
  reset: () => {
    console.log('🔄 [SUPER_ADMIN] Resetting store');
    set({
      activeAdminSection: 'dashboard',
      communitySearchQuery: '',
      userSearchQuery: '',
      selectedCommunityForView: null,
      selectedUserForView: null,
      showDeleteConfirmation: false,
      communityToDelete: null,
      analytics: null,
      communities: [],
      users: [],
      loading: false,
      error: null
    });
  }
}));
