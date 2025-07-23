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

    // Check for redirect result first (for COOP fallback)
    handleRedirectResult().catch((error) => {
      console.warn('No redirect result or error handling redirect:', error.message);
    });

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
      } catch (cleanupError) {
        console.warn('⚠️ [AUTH] Error during listener cleanup:', cleanupError);
        // Don't fail sign out if cleanup fails
      }

      await signOutUser();
      console.log('✅ Sign out successful');
      // User state will be updated by onAuthStateChanged listener
      // Reset loading state immediately since auth state change will handle the rest
      set({ loading: false });
    } catch (error: any) {
      console.error('❌ Sign out failed:', error);
      set({
        error: error instanceof Error ? error.message : 'Sign out failed',
        loading: false
      });
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

      // TODO: Implement Firestore user profile update
      // For now, just update local state
      const updatedUser = { ...user, ...updates };
      set({ user: updatedUser, loading: false });

      console.log('✅ Profile updated successfully');
    } catch (error: any) {
      console.error('❌ Profile update failed:', error);
      set({
        error: error instanceof Error ? error.message : 'Profile update failed',
        loading: false
      });
      throw error;
    }
  },

  // State setters
  setUser: (user: User | null) => {
    set({ user });

    // CRITICAL FIX: Clear all cached data when user changes to prevent data leakage
    if (!user) {
      console.log('🧹 [AUTH] User logged out, clearing all cached data...');

      // Clear announcement store data
      import('./announcementStore').then(({ useAnnouncementStore }) => {
        const announcementStore = useAnnouncementStore.getState();
        announcementStore.unsubscribeAll();
      });

      // Clear community store data
      import('./communityStore').then(({ useCommunityStore }) => {
        const communityStore = useCommunityStore.getState();
        communityStore.reset();
      });

      // Clear chat store data
      import('./chatStore').then(({ useChatStore }) => {
        const chatStore = useChatStore.getState();
        chatStore.unsubscribeAll();
      });
    } else {
      console.log('🔔 [AUTH] User logged in:', user.uid);

      // Clear any stale data from previous user
      import('./announcementStore').then(({ useAnnouncementStore }) => {
        const announcementStore = useAnnouncementStore.getState();
        announcementStore.unsubscribeAll();
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