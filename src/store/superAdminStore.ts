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

  // Modal state
  activeModal: string | null;
  modalData: any;

  // Actions
  setActiveAdminSection: (section: SuperAdminUIState['activeAdminSection']) => void;
  setCommunitySearchQuery: (query: string) => void;
  setUserSearchQuery: (query: string) => void;
  setSelectedCommunityForView: (communityId: string | null) => void;
  setSelectedUserForView: (userId: string | null) => void;
  setShowDeleteConfirmation: (show: boolean) => void;
  setCommunityToDelete: (communityId: string | null) => void;

  // Modal actions
  openModal: (modalId: string, data?: any) => void;
  closeModal: () => void;

  // Data loading
  loadAnalytics: () => Promise<void>;
  loadCommunities: () => Promise<void>;
  loadUsers: () => Promise<void>;
  deleteCommunity: (communityId: string) => Promise<void>;
  deleteCommunitydirect: (communityId: string) => Promise<void>;

  // Super Admin Setup
  checkSuperAdminClaims: () => Promise<boolean>;
  setupSuperAdminClaims: (password?: string) => Promise<any>;

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

  // Modal state
  activeModal: null,
  modalData: null,

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

  // Modal actions
  openModal: (modalId, data) => {
    console.log('🔧 [SUPER_ADMIN] Opening modal:', modalId, data);
    set({ activeModal: modalId, modalData: data || null });
  },

  closeModal: () => {
    console.log('🔧 [SUPER_ADMIN] Closing modal');
    set({ activeModal: null, modalData: null });
  },

  // Check if user is ready for super admin operations
  isUserReady: async () => {
    try {
      const { auth } = await import('../lib/firebase');
      const { useAuthStore } = await import('./authStore');

      const currentUser = auth.currentUser;
      const { isSuperAdmin } = useAuthStore.getState();

      return currentUser && isSuperAdmin;
    } catch (error) {
      console.error('❌ [SUPER_ADMIN] Error checking user readiness:', error);
      return false;
    }
  },

  // Super Admin Setup and Verification
  checkSuperAdminClaims: async () => {
    try {
      console.log('🔐 [SUPER_ADMIN] Checking super admin claims...');

      const { auth } = await import('../lib/firebase');
      const currentUser = auth.currentUser;

      if (!currentUser) {
        console.log('❌ [SUPER_ADMIN] No authenticated user found');
        return false;
      }

      // Get fresh token with claims
      const tokenResult = await currentUser.getIdTokenResult(true);
      const isSuperAdmin = tokenResult.claims.super_admin === true;

      console.log('🔍 [SUPER_ADMIN] Token claims:', {
        email: currentUser.email,
        uid: currentUser.uid,
        claims: tokenResult.claims,
        isSuperAdmin
      });

      // Update auth store
      const { useAuthStore } = await import('./authStore');
      useAuthStore.getState().setSuperAdminState(isSuperAdmin, tokenResult);

      return isSuperAdmin;
    } catch (error) {
      console.error('❌ [SUPER_ADMIN] Failed to check claims:', error);
      return false;
    }
  },

  setupSuperAdminClaims: async (password?: string) => {
    try {
      console.log('🔧 [SUPER_ADMIN] Setting up super admin claims...');

      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const { app } = await import('../lib/firebase');

      const functions = getFunctions(app);
      const setupSuperAdmin = httpsCallable(functions, 'setupSuperAdmin');

      const result = await setupSuperAdmin({
        email: '160422747039@mjcollege.ac.in',
        setupKey: 'SETUP_SUPER_ADMIN_2024',
        password: password || 'faraz123' // Default to faraz123 if no password provided
      });

      console.log('✅ [SUPER_ADMIN] Setup result:', result.data);

      // Refresh claims after setup
      await get().checkSuperAdminClaims();

      return result.data;
    } catch (error) {
      console.error('❌ [SUPER_ADMIN] Failed to setup claims:', error);
      throw error;
    }
  },

  // Data Loading Actions
  loadAnalytics: async () => {
    set({ loading: true, error: null });
    try {
      console.log('📊 [SUPER_ADMIN] Loading analytics...');

      // Wait for Firebase auth to be ready
      const { auth } = await import('../lib/firebase');

      // Wait for auth state to be ready
      await new Promise<void>((resolve, reject) => {
        const unsubscribe = auth.onAuthStateChanged((user) => {
          unsubscribe();
          if (user) {
            resolve();
          } else {
            reject(new Error('No authenticated user found'));
          }
        });

        // Timeout after 10 seconds
        setTimeout(() => {
          unsubscribe();
          reject(new Error('Authentication timeout'));
        }, 10000);
      });

      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No authenticated user found after auth state check');
      }

      console.log('🔐 [SUPER_ADMIN] Verifying super admin claims...');

      // Get fresh token with claims to verify super admin status
      const tokenResult = await currentUser.getIdTokenResult(true);
      const isSuperAdmin = tokenResult.claims.super_admin === true;

      console.log('🔍 [SUPER_ADMIN] Token verification:', {
        email: currentUser.email,
        uid: currentUser.uid,
        isSuperAdmin,
        claims: tokenResult.claims
      });

      if (!isSuperAdmin) {
        throw new Error('User must have super admin privileges to access analytics');
      }

      // Update auth store with verified super admin state
      const { useAuthStore } = await import('./authStore');
      useAuthStore.getState().setSuperAdminState(isSuperAdmin, tokenResult);

      // Try Firebase Functions first
      try {
        const { getFunctions, httpsCallable } = await import('firebase/functions');
        const { app } = await import('../lib/firebase');

        const functions = getFunctions(app);
        console.log('📞 [SUPER_ADMIN] Calling getSuperAdminAnalytics function...');
        const getSuperAdminAnalytics = httpsCallable(functions, 'getSuperAdminAnalytics');

        const callWithTimeout = async (timeoutMs: number = 10000) => {
          return Promise.race([
            getSuperAdminAnalytics(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Function call timeout')), timeoutMs)
            )
          ]);
        };

        const functionResult = await callWithTimeout();
        const analytics = functionResult.data as SuperAdminAnalytics;

        console.log('✅ [SUPER_ADMIN] Analytics loaded via Firebase Functions:', analytics);
        set({ analytics, loading: false });
        return;
      } catch (funcError) {
        console.warn('⚠️ [SUPER_ADMIN] Firebase Functions failed, trying direct Firestore access:', funcError);
      }

      // Fallback to direct Firestore access
      console.log('🔄 [SUPER_ADMIN] Using direct Firestore access...');
      const { collection, getDocs, query, where } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');

      const communitiesSnapshot = await getDocs(collection(db, 'communities'));
      const totalCommunities = communitiesSnapshot.size;

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

      const recentCommunitiesSnapshot = await getDocs(
        query(collection(db, 'communities'), where('createdAt', '>=', oneWeekAgo))
      );
      const communitiesCreatedThisWeek = recentCommunitiesSnapshot.size;

      const flaggedCommunitiesSnapshot = await getDocs(
        query(collection(db, 'communities'), where('flagged', '==', true))
      );
      const flaggedCommunities = flaggedCommunitiesSnapshot.size;

      const fallbackAnalytics: SuperAdminAnalytics = {
        totalUsers: 0,
        totalCommunities,
        communitiesCreatedThisWeek,
        flaggedCommunities,
        storageUsage: 0,
        topActiveCommunities: []
      };

      console.log('✅ [SUPER_ADMIN] Fallback analytics loaded:', fallbackAnalytics);
      set({ analytics: fallbackAnalytics, loading: false });
    } catch (mainError) {
      console.error('❌ [SUPER_ADMIN] Analytics loading failed:', mainError);
      set({
        analytics: null,
        error: mainError instanceof Error ? mainError.message : 'Failed to load analytics',
        loading: false
      });
    }
  },

  loadCommunities: async () => {
    set({ loading: true, error: null });
    try {
      console.log('🏢 [SUPER_ADMIN] Loading communities with optimized real-time data...');

      // Import Firestore
      const { collection, getDocs, query, orderBy, limit, where, doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');

      const communitiesQuery = query(
        collection(db, 'communities'),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(communitiesQuery);

      // First, set basic community data immediately for faster UI response
      const basicCommunities: SuperAdminCommunityView[] = snapshot.docs.map(communityDoc => {
        const data = communityDoc.data();
        return {
          id: communityDoc.id,
          name: data.name || 'Unknown',
          description: data.description || '',
          creatorEmail: data.creatorEmail || 'Unknown',
          creatorName: 'Loading...',
          creatorUid: data.createdBy || '',
          createdAt: data.createdAt?.toDate() || new Date(),
          memberCount: 0,
          resourceCount: 0,
          messageCount: 0,
          eventCount: 0,
          flagged: data.flagged || false,
          lastActivity: data.createdAt?.toDate() || new Date()
        };
      });

      // Set basic data immediately
      set({ communities: basicCommunities, loading: false });

      // Now fetch detailed data in batches for better performance
      console.log('📊 [SUPER_ADMIN] Fetching detailed data in optimized batches...');

      const BATCH_SIZE = 5; // Process 5 communities at a time
      const communityDocs = snapshot.docs;

      for (let i = 0; i < communityDocs.length; i += BATCH_SIZE) {
        const batch = communityDocs.slice(i, i + BATCH_SIZE);

        // Process batch in parallel
        const batchResults = await Promise.all(
          batch.map(async (communityDoc) => {
            const data = communityDoc.data();
            const communityId = communityDoc.id;

            try {
              // Fetch all subcollection counts in parallel
              const [rolesSnapshot, messagesSnapshot, resourcesSnapshot, calendarSnapshot] = await Promise.all([
                getDocs(collection(db, 'communities', communityId, 'roles')),
                getDocs(collection(db, 'communities', communityId, 'messages')),
                getDocs(query(collection(db, 'resources'), where('communityId', '==', communityId))),
                getDocs(collection(db, 'communities', communityId, 'calendar'))
              ]);

              const memberCount = rolesSnapshot.size;
              const messageCount = messagesSnapshot.size;
              const resourceCount = resourcesSnapshot.size;
              const eventCount = calendarSnapshot.size;

              // Get creator information and last activity in parallel
              const [creatorInfo, lastActivityInfo] = await Promise.all([
                // Creator info
                (async () => {
                  let creatorEmail = data.creatorEmail || 'Unknown';
                  let creatorName = 'Unknown User';

                  if (data.createdBy) {
                    try {
                      const userDoc = await getDoc(doc(db, 'users', data.createdBy));
                      if (userDoc.exists()) {
                        const userData = userDoc.data();
                        creatorEmail = userData.email || creatorEmail;
                        creatorName = userData.displayName || userData.name || creatorName;
                      }
                    } catch (userError) {
                      console.warn(`⚠️ [SUPER_ADMIN] Could not fetch creator info for ${communityId}:`, userError);
                    }
                  }
                  return { creatorEmail, creatorName };
                })(),

                // Last activity
                (async () => {
                  let lastActivity = data.createdAt?.toDate() || new Date();
                  if (messageCount > 0) {
                    try {
                      const lastMessageQuery = query(
                        collection(db, 'communities', communityId, 'messages'),
                        orderBy('createdAt', 'desc'),
                        limit(1)
                      );
                      const lastMessageSnapshot = await getDocs(lastMessageQuery);
                      if (!lastMessageSnapshot.empty) {
                        const lastMessageData = lastMessageSnapshot.docs[0].data();
                        lastActivity = lastMessageData.createdAt?.toDate() || lastActivity;
                      }
                    } catch (messageError) {
                      console.warn(`⚠️ [SUPER_ADMIN] Could not fetch last message for ${communityId}:`, messageError);
                    }
                  }
                  return lastActivity;
                })()
              ]);

              return {
                id: communityId,
                name: data.name || 'Unknown',
                description: data.description || '',
                creatorEmail: creatorInfo.creatorEmail,
                creatorName: creatorInfo.creatorName,
                creatorUid: data.createdBy || '',
                createdAt: data.createdAt?.toDate() || new Date(),
                memberCount,
                resourceCount,
                messageCount,
                eventCount,
                flagged: data.flagged || false,
                lastActivity: lastActivityInfo
              };
            } catch (error) {
              console.error(`❌ [SUPER_ADMIN] Failed to fetch data for community ${communityId}:`, error);
              // Return basic data if detailed fetch fails
              return {
                id: communityId,
                name: data.name || 'Unknown',
                description: data.description || '',
                creatorEmail: data.creatorEmail || 'Unknown',
                creatorName: 'Error loading',
                creatorUid: data.createdBy || '',
                createdAt: data.createdAt?.toDate() || new Date(),
                memberCount: 0,
                resourceCount: 0,
                messageCount: 0,
                eventCount: 0,
                flagged: data.flagged || false,
                lastActivity: data.createdAt?.toDate() || new Date()
              };
            }
          })
        );

        // Update state with this batch
        const { communities: currentCommunities } = get();
        const updatedCommunities = [...currentCommunities];

        batchResults.forEach((result, index) => {
          const globalIndex = i + index;
          if (globalIndex < updatedCommunities.length) {
            updatedCommunities[globalIndex] = result;
          }
        });

        set({ communities: updatedCommunities });

        console.log(`✅ [SUPER_ADMIN] Processed batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(communityDocs.length / BATCH_SIZE)}`);

        // Small delay between batches to prevent overwhelming Firestore
        if (i + BATCH_SIZE < communityDocs.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`🎉 [SUPER_ADMIN] Successfully loaded ${communityDocs.length} communities with optimized real-time data`);
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

        // Call the correct function name (without prefix)
        const deleteCommunityRecursively = httpsCallable(functions, 'deleteCommunityRecursively');
        console.log('🔧 [SUPER_ADMIN] Calling deleteCommunityRecursively...');

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
      activeModal: null,
      modalData: null,
      analytics: null,
      communities: [],
      users: [],
      loading: false,
      error: null
    });
  }
}));
