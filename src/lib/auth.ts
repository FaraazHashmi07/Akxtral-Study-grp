import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendEmailVerification,
  updateProfile,
  User as FirebaseUser,
  UserCredential
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { User } from '../types';

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Create user profile in Firestore
export const createUserProfile = async (firebaseUser: FirebaseUser, additionalData?: any): Promise<User> => {
  try {
    console.log('Attempting to create/update user profile for:', firebaseUser.uid);
    const userRef = doc(db, 'users', firebaseUser.uid);

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Firestore timeout')), 8000);
    });

    const userSnap = await Promise.race([
      getDoc(userRef),
      timeoutPromise
    ]);

    if (!userSnap.exists()) {
      console.log('Creating new user profile in Firestore...');
      const { displayName, email, photoURL, providerData } = firebaseUser;
      const providerIds = providerData.map(provider => provider.providerId);

      const userData: Omit<User, 'uid'> = {
        email: email || '',
        displayName: displayName || email?.split('@')[0] || 'User',
        photoURL: photoURL || '',
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
        providerIds,
        emailVerified: firebaseUser.emailVerified,
        createdAt: new Date(),
        lastLoginAt: new Date(),
        globalRole: 'user', // All users have the same global role
        communityRoles: {},
        ...additionalData
      };

      await Promise.race([
        setDoc(userRef, {
          ...userData,
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp()
        }),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Firestore write timeout')), 8000);
        })
      ]);

      console.log('User profile created successfully in Firestore');
      return { uid: firebaseUser.uid, ...userData };
    }

    console.log('Updating existing user profile...');
    // Update last login time
    await Promise.race([
      updateDoc(userRef, {
        lastLoginAt: serverTimestamp(),
        emailVerified: firebaseUser.emailVerified
      }),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Firestore update timeout')), 8000);
      })
    ]);

    const userData = userSnap.data() as Omit<User, 'uid'>;
    console.log('User profile updated successfully');
    return { uid: firebaseUser.uid, ...userData };
  } catch (error: any) {
    console.error('Firestore error in createUserProfile:', error);

    // If Firestore is unavailable, return a minimal user profile from Firebase Auth data
    console.log('Creating fallback user profile from Firebase Auth data');
    const { displayName, email, photoURL, providerData } = firebaseUser;
    const providerIds = providerData.map(provider => provider.providerId);

    const fallbackUserData: User = {
      uid: firebaseUser.uid,
      email: email || '',
      displayName: displayName || email?.split('@')[0] || 'User',
      photoURL: photoURL || '',
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
      providerIds,
      emailVerified: firebaseUser.emailVerified,
      createdAt: new Date(),
      lastLoginAt: new Date(),
      globalRole: 'user',
      communityRoles: {},
      ...additionalData
    };

    return fallbackUserData;
  }
};

// Get user profile from Firestore
export const getUserProfile = async (uid: string): Promise<User | null> => {
  try {
    console.log('🔍 Attempting to get user profile from Firestore:', uid);
    const userRef = doc(db, 'users', uid);

    // Add timeout to prevent hanging
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Firestore timeout')), 8000);
    });

    const userSnap = await Promise.race([
      getDoc(userRef),
      timeoutPromise
    ]);

    if (userSnap.exists()) {
      console.log('✅ User profile found in Firestore');
      const userData = userSnap.data() as Omit<User, 'uid'>;
      return { uid, ...userData };
    }

    console.log('❌ User profile not found in Firestore');
    return null;
  } catch (error: any) {
    console.error('❌ Error getting user profile from Firestore:', error.message);
    return null;
  }
};

// Update user profile
export const updateUserProfile = async (uid: string, updates: Partial<User>): Promise<void> => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, updates);
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

// Sign up with email and password
export const signUpWithEmailAndPassword = async (
  email: string,
  password: string,
  displayName: string
): Promise<UserCredential> => {
  try {
    console.log('Attempting to create user with email:', email);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    console.log('User created successfully:', userCredential.user.uid);

    // Update display name
    await updateProfile(userCredential.user, { displayName });
    console.log('Display name updated');

    // Send email verification
    await sendEmailVerification(userCredential.user);
    console.log('Email verification sent');

    // Create user profile in Firestore
    await createUserProfile(userCredential.user, { displayName });
    console.log('User profile created in Firestore');

    return userCredential;
  } catch (error: any) {
    console.error('Error signing up:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);

    // Provide user-friendly error messages
    let userMessage = 'Failed to create account. ';
    switch (error.code) {
      case 'auth/email-already-in-use':
        userMessage += 'An account with this email already exists.';
        break;
      case 'auth/invalid-email':
        userMessage += 'Please enter a valid email address.';
        break;
      case 'auth/weak-password':
        userMessage += 'Password should be at least 6 characters.';
        break;
      case 'auth/network-request-failed':
        userMessage += 'Network error. Please check your internet connection.';
        break;
      default:
        userMessage += error.message;
    }

    const enhancedError = new Error(userMessage);
    (enhancedError as any).code = error.code;
    throw enhancedError;
  }
};

// Sign in with email and password
export const signInWithEmailAndPasswordAuth = async (
  email: string,
  password: string
): Promise<UserCredential> => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    // Update user profile with last login
    await createUserProfile(userCredential.user);
    
    return userCredential;
  } catch (error) {
    console.error('Error signing in:', error);
    throw error;
  }
};

// Sign in with Google
export const signInWithGoogle = async (): Promise<UserCredential> => {
  try {
    console.log('Attempting Google sign-in...');
    const userCredential = await signInWithPopup(auth, googleProvider);
    console.log('Google sign-in successful:', userCredential.user.uid);

    // Try to create or update user profile, but don't fail if Firestore is unavailable
    try {
      await createUserProfile(userCredential.user);
      console.log('User profile updated in Firestore');
    } catch (firestoreError: any) {
      console.warn('Failed to update user profile in Firestore:', firestoreError.message);
      // Don't throw error - authentication was successful even if profile creation failed
    }

    return userCredential;
  } catch (error: any) {
    console.error('Error signing in with Google:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);

    // Provide user-friendly error messages
    let userMessage = 'Failed to sign in with Google. ';
    switch (error.code) {
      case 'auth/popup-closed-by-user':
        userMessage += 'Sign-in was cancelled.';
        break;
      case 'auth/popup-blocked':
        userMessage += 'Pop-up was blocked by your browser. Please allow pop-ups and try again.';
        break;
      case 'auth/network-request-failed':
        userMessage += 'Network error. Please check your internet connection.';
        break;
      case 'auth/unauthorized-domain':
        userMessage += 'This domain is not authorized for Google sign-in.';
        break;
      default:
        userMessage += error.message;
    }

    const enhancedError = new Error(userMessage);
    (enhancedError as any).code = error.code;
    throw enhancedError;
  }
};

// Sign out
export const signOutUser = async (): Promise<void> => {
  try {
    console.log('🔄 Calling Firebase signOut...');
    await signOut(auth);
    console.log('✅ Firebase signOut completed');
  } catch (error: any) {
    console.error('❌ Firebase signOut error:', error);
    throw error;
  }
};

// Check if user has global role (simplified - all users are 'user')
export const hasGlobalRole = (user: User | null, role: 'user'): boolean => {
  return user?.globalRole === role;
};

// Check if user has community role
export const hasCommunityRole = (
  user: User | null,
  communityId: string,
  roles: string[]
): boolean => {
  if (!user?.communityRoles?.[communityId]) return false;
  return roles.includes(user.communityRoles[communityId].role);
};

// Check if user is community admin (no global admin override)
export const isCommunityAdmin = (user: User | null, communityId: string): boolean => {
  return hasCommunityRole(user, communityId, ['community_admin']);
};

// Check if user is community moderator or higher
export const isCommunityModerator = (user: User | null, communityId: string): boolean => {
  return hasCommunityRole(user, communityId, ['community_admin', 'community_moderator']);
};

// Check if user is community member or higher
export const isCommunityMember = (user: User | null, communityId: string): boolean => {
  return hasCommunityRole(user, communityId, ['community_admin', 'community_moderator', 'community_member']);
};
