import { create } from 'zustand';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../lib/firebase';
import {
  signUpWithEmailAndPassword,
  signInWithEmailAndPasswordAuth,
  signInWithGoogle,
  signOutUser,
  getUserProfile,
  createUserProfile,
  handleRedirectResult
} from '../lib/auth';
import { getAllCommunityRoles } from '../lib/userProfile';
import { User, AuthState, SuperAdminState } from '../types';
import { useNotificationStore } from './notificationStore';

interface AuthStore extends AuthState, SuperAdminState {
  // Authentication methods
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogleProvider: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  refreshUserProfile: () => Promise<void>;

  // State management
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Two-factor authentication
  showTwoFactor: boolean;
  setShowTwoFactor: (show: boolean) => void;

  // Initialize auth listener
  initialize: () => void;

  // Set loading state (for debugging)
  setLoading: (loading: boolean) => void;

  // Super Admin methods
  setSuperAdminState: (isSuperAdmin: boolean, token?: any) => void;
  checkSuperAdminClaims: () => Promise<void>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  loading: true,
  error: null,
  showTwoFactor: false,

  // Super Admin state
  isSuperAdmin: false,
  superAdminToken: null,

  // Initialize authentication state listener
  initialize: () => {
    console.log('🔄 Initializing Firebase auth listener...');

    // CRITICAL FIX: Only check for redirect result if we're not in a signout process
    // This prevents automatic re-authentication after user signs out
    const isSigningOut = sessionStorage.getItem('signing-out') === 'true';
    if (!isSigningOut) {
      // Check for redirect result first (for COOP fallback)
      handleRedirectResult().catch((error) => {
        console.warn('No redirect result or error handling redirect:', error.message);
      });
    } else {
      console.log('🚫 Skipping redirect result check - signout in progress');
      return () => {}; // Return empty cleanup function
    }

    // Set a shorter timeout for initial auth check
    const timeoutId = setTimeout(() => {
      console.warn('⚠️ Auth initialization timeout - setting loading to false');
      const currentState = get();
      if (currentState.loading) {
        console.log('🔧 Timeout reached, proceeding without user');
        set({ loading: false, user: null, error: null, showTwoFactor: false });
      }
    }, 5000); // Reduced to 5 seconds

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      console.log('🔥 Auth state changed:', firebaseUser ? `User: ${firebaseUser.uid}` : 'No user');

      // Clear timeout since auth state changed
      clearTimeout(timeoutId);

      if (firebaseUser) {
        console.log('✅ Firebase user authenticated:', firebaseUser.uid);

        // Check for Super Admin custom claims
        try {
          const tokenResult = await firebaseUser.getIdTokenResult();
          const isSuperAdmin = tokenResult.claims.super_admin === true;

          if (isSuperAdmin) {
            console.log('🔐 Super Admin detected:', firebaseUser.email);
            set({
              isSuperAdmin: true,
              superAdminToken: tokenResult,
              user: null, // Super Admin doesn't have a regular user profile
              loading: false,
              error: null
            });
            return;
          }
        } catch (error) {
          console.warn('⚠️ Failed to check custom claims:', error);
          // Continue with regular user flow
        }

        // Create minimal user profile from Firebase Auth data (skip Firestore for now)
        const userProfile: User = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'User',
          photoURL: firebaseUser.photoURL || '',
          bio: '',
          preferences: {
            darkMode: false,
            locale: 'en',
            notifications: {
              email: true,
              push: true,
              mentions: true
            }
          },
          providerIds: firebaseUser.providerData.map(p => p.providerId),
          emailVerified: firebaseUser.emailVerified,
          createdAt: new Date(),
          lastLoginAt: new Date(),
          globalRole: 'user',
          communityRoles: {}
        };

        console.log('✅ Setting user profile and stopping loading...');
        set({ user: userProfile, loading: false, showTwoFactor: false, error: null });

        // Try to sync with Firestore in background (non-blocking)
        try {
          console.log('🔄 Attempting background Firestore sync...');
          const firestoreProfile = await getUserProfile(firebaseUser.uid);
          if (firestoreProfile) {
            console.log('✅ Firestore profile found, loading community roles...');

            // Load community roles for the user
            const communityRoles = await getAllCommunityRoles(firebaseUser.uid);
            const updatedProfile = { ...firestoreProfile, communityRoles };

            console.log('✅ Community roles loaded, updating state');
            set({ user: updatedProfile });
          } else {
            console.log('🔄 Creating Firestore profile in background...');
            await createUserProfile(firebaseUser);
          }
        } catch (firestoreError: any) {
          console.warn('⚠️ Firestore sync failed (non-critical):', firestoreError.message);
          // Don't update error state - user is still authenticated
        }
      } else {
        console.log('❌ No Firebase user - user signed out');
        set({
          user: null,
          loading: false,
          showTwoFactor: false,
          error: null,
          isSuperAdmin: false,
          superAdminToken: null
        });
      }
    });

    console.log('✅ Firebase auth listener initialized');

    // Return cleanup function
    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  },

  // Sign up with email and password
  signUp: async (email: string, password: string, displayName: string) => {
    set({ loading: true, error: null });

    try {
      await signUpWithEmailAndPassword(email, password, displayName);
      // User state will be updated by onAuthStateChanged
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Sign up failed',
        loading: false
      });
      throw error;
    }
  },

  // Sign in with email and password
  signIn: async (email: string, password: string) => {
    set({ loading: true, error: null });

    try {
      await signInWithEmailAndPasswordAuth(email, password);
      // User state will be updated by onAuthStateChanged
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Sign in failed',
        loading: false
      });
      throw error;
    }
  },

  // Sign in with Google
  signInWithGoogleProvider: async () => {
    set({ loading: true, error: null });

    try {
      await signInWithGoogle();
      // User state will be updated by onAuthStateChanged
    } catch (error: any) {
      console.error('Google sign in error:', error);

      let userFriendlyMessage = 'Google sign in failed';

      // Handle specific Firebase errors
      if (error.code === 'auth/api-key-not-valid' || error.message?.includes('api-key-not-valid')) {
        userFriendlyMessage = 'Authentication service is not properly configured. Please contact support.';
      } else if (error.message?.includes('Authentication unavailable')) {
        userFriendlyMessage = 'Authentication is currently unavailable. Please try again later.';
      } else if (error.code === 'auth/popup-closed-by-user') {
        userFriendlyMessage = 'Sign in was cancelled. Please try again.';
      } else if (error.code === 'auth/popup-blocked') {
        userFriendlyMessage = 'Pop-up was blocked by your browser. Please allow pop-ups and try again.';
      } else if (error.code === 'auth/network-request-failed') {
        userFriendlyMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message?.includes('Demo mode')) {
        userFriendlyMessage = 'Authentication is in demo mode. Full functionality requires Firebase configuration.';
      }

      set({
        error: userFriendlyMessage,
        loading: false
      });
      throw new Error(userFriendlyMessage);
    }
  },

  // Sign out
  signOut: async () => {
    console.log('🔄 Starting sign out process...');
    set({ loading: true, error: null });

    try {
      // CRITICAL FIX: Set flag to prevent re-authentication during signout
      sessionStorage.setItem('signing-out', 'true');
      console.log('🔧 [AUTH] Signing-out flag set to prevent re-authentication');

      // CRITICAL FIX: Clean up all real-time listeners before signing out
      console.log('🧹 [AUTH] Cleaning up listeners before sign out...');

      try {
        // Clean up announcement listeners
        const { useAnnouncementStore } = await import('./announcementStore');
        const announcementStore = useAnnouncementStore.getState();
        if (announcementStore.unsubscribeAll) {
          announcementStore.unsubscribeAll();
        }

        // Clean up chat listeners
        const { useChatStore } = await import('./chatStore');
        const chatStore = useChatStore.getState();
        if (chatStore.unsubscribeAll) {
          chatStore.unsubscribeAll();
        }

        // CRITICAL FIX: Clean up community store immediately to prevent race conditions
        const { useCommunityStore } = await import('./communityStore');
        const communityStore = useCommunityStore.getState();
        if (communityStore.reset) {
          communityStore.reset();
        }
      } catch (cleanupError) {
        console.warn('⚠️ [AUTH] Error during listener cleanup:', cleanupError);
        // Don't fail sign out if cleanup fails
      }

      // CRITICAL FIX: Clear user state BEFORE calling signOutUser to ensure immediate state change
      console.log('🔄 [AUTH] Clearing user state before Firebase signout...');
      set({ 
        user: null, 
        loading: false, 
        error: null, 
        showTwoFactor: false,
        isSuperAdmin: false,
        superAdminToken: null 
      });

      // Call Firebase signout
      await signOutUser();
      console.log('✅ Sign out successful - user state cleared and Firebase signout completed');
      
      // Clear the signing-out flag after successful signout
      sessionStorage.removeItem('signing-out');
      
    } catch (error: any) {
      console.error('❌ Sign out failed:', error);
      // Even if signout fails, clear the user state to prevent stuck state
      set({
        user: null,
        error: error instanceof Error ? error.message : 'Sign out failed',
        loading: false,
        isSuperAdmin: false,
        superAdminToken: null
      });
      // Clear the signing-out flag even on error
      sessionStorage.removeItem('signing-out');
      throw error;
    }
  },

  // Update user profile
  updateProfile: async (updates: Partial<User>) => {
    set({ loading: true, error: null });
    try {
      const { user } = get();
      if (!user) {
        throw new Error('No user logged in');
      }

      console.log('🔄 [PROFILE] Updating user profile in Firestore...', updates);

      // Import the updateUserProfile function dynamically to avoid circular imports
      const { updateUserProfile } = await import('../lib/userProfile');

      // Update Firestore first
      await updateUserProfile(user.uid, updates);

      // Update Firebase Auth profile if displayName or photoURL changed
      if (updates.displayName || updates.photoURL !== undefined) {
        const { updateProfile: updateFirebaseProfile } = await import('firebase/auth');
        const { auth } = await import('../lib/firebase');

        if (auth.currentUser) {
          const authUpdates: any = {};
          if (updates.displayName) authUpdates.displayName = updates.displayName;
          if (updates.photoURL !== undefined) authUpdates.photoURL = updates.photoURL;

          await updateFirebaseProfile(auth.currentUser, authUpdates);
          console.log('✅ [PROFILE] Firebase Auth profile updated');
        }
      }

      // OPTIMIZED: Store profile in cache for new messages only
      if (updates.displayName || updates.photoURL !== undefined) {
        try {
          console.log('🔄 [PROFILE] Storing profile for new chat messages...');
          const { updateUserMessagesProfile } = await import('../services/chatService');
          
          const chatUpdates: { displayName?: string; photoURL?: string } = {};
          if (updates.displayName) chatUpdates.displayName = updates.displayName;
          if (updates.photoURL !== undefined) chatUpdates.photoURL = updates.photoURL;
          
          // Store profile for new messages only - no historical updates
          await updateUserMessagesProfile(user.uid, chatUpdates);
          
          console.log('✅ [PROFILE] Profile cached for new chat messages');
        } catch (chatError) {
          console.warn('⚠️ [PROFILE] Failed to cache profile for chat, but profile update succeeded:', chatError);
          // Don't fail the entire profile update if chat update fails
        }
      }

      // Update local state
      const updatedUser = { ...user, ...updates };
      set({ user: updatedUser, loading: false });

      console.log('✅ [PROFILE] Profile updated successfully in Firestore and local state');
    } catch (error: any) {
      console.error('❌ [PROFILE] Profile update failed:', error);
      set({
        error: error instanceof Error ? error.message : 'Profile update failed',
        loading: false
      });
      throw error;
    }
  },

  // Refresh user profile from Firestore
  refreshUserProfile: async () => {
    try {
      const { user } = get();
      if (!user) return;

      // Import functions dynamically to avoid circular imports
      const { getUserProfile } = await import('../lib/auth');
      const { getAllCommunityRoles } = await import('../lib/userProfile');

      const firestoreProfile = await getUserProfile(user.uid);
      if (firestoreProfile) {
        // Load community roles for the user
        const communityRoles = await getAllCommunityRoles(user.uid);
        const updatedProfile = { ...firestoreProfile, communityRoles };

        set({ user: updatedProfile });
      }
    } catch (error) {
      console.error('❌ [PROFILE] Failed to refresh user profile:', error);
    }
  },

  // State setters
  setUser: (user: User | null) => {
    set({ user });

    // CRITICAL FIX: Clear all cached data when user changes to prevent data leakage
    if (!user) {
      console.log('🧹 [AUTH] User logged out, clearing all cached data synchronously...');

      // Clear stores synchronously to prevent race conditions during signout
      try {
        // Clear announcement store data
        import('./announcementStore').then(({ useAnnouncementStore }) => {
          const announcementStore = useAnnouncementStore.getState();
          if (announcementStore.unsubscribeAll) {
            announcementStore.unsubscribeAll();
          }
        });

        // Clear community store data
        import('./communityStore').then(({ useCommunityStore }) => {
          const communityStore = useCommunityStore.getState();
          if (communityStore.reset) {
            communityStore.reset();
          }
        });

        // Clear chat store data
        import('./chatStore').then(({ useChatStore }) => {
          const chatStore = useChatStore.getState();
          if (chatStore.unsubscribeAll) {
            chatStore.unsubscribeAll();
          }
        });
      } catch (cleanupError) {
        console.warn('⚠️ [AUTH] Error during store cleanup:', cleanupError);
      }
    } else {
      console.log('🔔 [AUTH] User logged in:', user.uid);

      // Clear any stale data from previous user
      import('./announcementStore').then(({ useAnnouncementStore }) => {
        const announcementStore = useAnnouncementStore.getState();
        if (announcementStore.unsubscribeAll) {
          announcementStore.unsubscribeAll();
        }
      });
    }

    // Subscribe to notifications when user logs in, unsubscribe when logs out
    const { subscribeToNotifications, unsubscribeFromNotifications } = useNotificationStore.getState();

    if (user) {
      subscribeToNotifications(user.uid);
    } else {
      unsubscribeFromNotifications();
    }
  },
  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: string | null) => set({ error }),
  setShowTwoFactor: (show: boolean) => set({ showTwoFactor: show }),

  // Super Admin methods
  setSuperAdminState: (isSuperAdmin: boolean, token?: any) => {
    console.log('🔐 Setting Super Admin state:', isSuperAdmin);
    set({ isSuperAdmin, superAdminToken: token || null });
  },

  checkSuperAdminClaims: async () => {
    try {
      const { auth } = await import('../lib/firebase');
      const currentUser = auth.currentUser;

      if (currentUser) {
        const tokenResult = await currentUser.getIdTokenResult();
        const isSuperAdmin = tokenResult.claims.super_admin === true;

        if (isSuperAdmin !== get().isSuperAdmin) {
          console.log('🔄 Super Admin status changed:', isSuperAdmin);
          set({ isSuperAdmin, superAdminToken: isSuperAdmin ? tokenResult : null });
        }
      }
    } catch (error) {
      console.error('❌ Failed to check Super Admin claims:', error);
    }
  },

  // Refresh community roles for current user
  refreshCommunityRoles: async () => {
    const { user } = get();
    if (!user) return;

    try {
      console.log('🔄 [AUTH] Refreshing community roles for user:', user.uid);
      const communityRoles = await getAllCommunityRoles(user.uid);
      const updatedUser = { ...user, communityRoles };
      set({ user: updatedUser });
      console.log('✅ [AUTH] Community roles refreshed:', communityRoles);
    } catch (error) {
      console.error('❌ [AUTH] Failed to refresh community roles:', error);
    }
  }
}));