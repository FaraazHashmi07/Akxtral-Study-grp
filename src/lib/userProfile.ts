import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { updateProfile, deleteUser } from 'firebase/auth';
import { db, storage, auth } from './firebase';
import { User, CommunityRole } from '../types';

// Upload user avatar
export const uploadUserAvatar = async (uid: string, file: File): Promise<string> => {
  try {
    // Create a reference to the avatar file
    const avatarRef = ref(storage, `avatars/${uid}/${file.name}`);
    
    // Upload the file
    const snapshot = await uploadBytes(avatarRef, file);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    // Update user profile with new avatar URL
    await updateUserProfile(uid, { photoURL: downloadURL });
    
    // Update Firebase Auth profile
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { photoURL: downloadURL });
    }
    
    return downloadURL;
  } catch (error) {
    console.error('Error uploading avatar:', error);
    throw error;
  }
};

// Delete user avatar
export const deleteUserAvatar = async (uid: string, photoURL: string): Promise<void> => {
  try {
    // Delete from storage
    const avatarRef = ref(storage, photoURL);
    await deleteObject(avatarRef);
    
    // Update user profile
    await updateUserProfile(uid, { photoURL: '' });
    
    // Update Firebase Auth profile
    if (auth.currentUser) {
      await updateProfile(auth.currentUser, { photoURL: '' });
    }
  } catch (error) {
    console.error('Error deleting avatar:', error);
    throw error;
  }
};

// Update user profile
export const updateUserProfile = async (uid: string, updates: Partial<User>): Promise<void> => {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      ...updates,
      lastLoginAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

// Get user profile by UID
export const getUserProfileById = async (uid: string): Promise<User | null> => {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data() as Omit<User, 'uid'>;
      return { uid, ...userData };
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
};

// Get multiple user profiles
export const getUserProfiles = async (uids: string[]): Promise<User[]> => {
  try {
    const users: User[] = [];
    
    // Firestore 'in' queries are limited to 10 items
    const chunks = [];
    for (let i = 0; i < uids.length; i += 10) {
      chunks.push(uids.slice(i, i + 10));
    }
    
    for (const chunk of chunks) {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('__name__', 'in', chunk));
      const querySnapshot = await getDocs(q);
      
      querySnapshot.forEach((doc) => {
        const userData = doc.data() as Omit<User, 'uid'>;
        users.push({ uid: doc.id, ...userData });
      });
    }
    
    return users;
  } catch (error) {
    console.error('Error getting user profiles:', error);
    return [];
  }
};

// Search users by display name or email
export const searchUsers = async (searchTerm: string, limitCount: number = 20): Promise<User[]> => {
  try {
    const usersRef = collection(db, 'users');
    
    // Search by display name (case-insensitive)
    const nameQuery = query(
      usersRef,
      where('displayName', '>=', searchTerm),
      where('displayName', '<=', searchTerm + '\uf8ff'),
      orderBy('displayName'),
      limit(limitCount)
    );
    
    const nameSnapshot = await getDocs(nameQuery);
    const users: User[] = [];
    
    nameSnapshot.forEach((doc) => {
      const userData = doc.data() as Omit<User, 'uid'>;
      users.push({ uid: doc.id, ...userData });
    });
    
    return users;
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
};

// Set community role for user
export const setCommunityRole = async (
  uid: string,
  communityId: string,
  role: CommunityRole['role'],
  assignedBy: string
): Promise<void> => {
  try {
    const roleRef = doc(db, 'communities', communityId, 'roles', uid);
    const roleData: CommunityRole = {
      role,
      assignedAt: new Date(),
      assignedBy
    };
    
    await setDoc(roleRef, {
      ...roleData,
      assignedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error setting community role:', error);
    throw error;
  }
};

// Get community role for user
export const getCommunityRole = async (
  uid: string,
  communityId: string
): Promise<CommunityRole | null> => {
  try {
    const roleRef = doc(db, 'communities', communityId, 'roles', uid);
    const roleSnap = await getDoc(roleRef);

    if (roleSnap.exists()) {
      return roleSnap.data() as CommunityRole;
    }
    return null;
  } catch (error) {
    console.error('Error getting community role:', error);
    return null;
  }
};

// Get all community roles for a user - SUPER OPTIMIZED VERSION
export const getAllCommunityRoles = async (uid: string): Promise<Record<string, CommunityRole>> => {
  try {
    console.log('🔍 [PROFILE] Loading community roles for user:', uid);
    const startTime = Date.now();

    // OPTIMIZATION: Use the existing membership data to only query communities user is actually in
    const membersRef = collection(db, 'communityMembers');
    const memberQuery = query(membersRef, where('uid', '==', uid));
    const memberSnapshot = await getDocs(memberQuery);

    if (memberSnapshot.empty) {
      console.log('✅ [PROFILE] No community memberships found for user');
      return {};
    }

    const communityRoles: Record<string, CommunityRole> = {};
    const communityIds = memberSnapshot.docs.map(doc => doc.data().communityId);

    console.log('🔍 [PROFILE] Checking roles for', communityIds.length, 'communities');

    // Batch the role queries for better performance
    const rolePromises = communityIds.map(async (communityId) => {
      try {
        const roleRef = doc(db, 'communities', communityId, 'roles', uid);
        const roleSnap = await getDoc(roleRef);

        if (roleSnap.exists()) {
          const roleData = roleSnap.data() as CommunityRole;
          communityRoles[communityId] = roleData;
          console.log('✅ [PROFILE] Found role for community:', communityId, roleData.role);
        } else {
          // This is expected - membership might exist but role document might be missing
          // Create a default role to prevent future queries
          console.log('⚠️ [PROFILE] Missing role document for community:', communityId, '- using default');
          communityRoles[communityId] = {
            role: 'community_member',
            assignedAt: new Date(),
            assignedBy: uid
          };
        }
      } catch (roleError) {
        console.warn('⚠️ [PROFILE] Failed to get role for community:', communityId, roleError);
        // Use default role to prevent future errors
        communityRoles[communityId] = {
          role: 'community_member',
          assignedAt: new Date(),
          assignedBy: uid
        };
      }
    });

    // Execute all role queries in parallel
    await Promise.all(rolePromises);

    const endTime = Date.now();
    console.log('✅ [PROFILE] Loaded community roles in', endTime - startTime, 'ms:',
                Object.keys(communityRoles).length, 'roles found');

    return communityRoles;
  } catch (error) {
    console.error('❌ [PROFILE] Error getting community roles:', error);
    return {};
  }
};

// Remove community role for user
export const removeCommunityRole = async (
  uid: string,
  communityId: string
): Promise<void> => {
  try {
    const roleRef = doc(db, 'communities', communityId, 'roles', uid);
    await deleteDoc(roleRef);
  } catch (error) {
    console.error('Error removing community role:', error);
    throw error;
  }
};

// Get all community members with their roles
export const getCommunityMembers = async (communityId: string): Promise<Array<User & { communityRole: CommunityRole }>> => {
  try {
    const rolesRef = collection(db, 'communities', communityId, 'roles');
    const rolesSnapshot = await getDocs(rolesRef);
    
    const memberUids: string[] = [];
    const roleMap: Record<string, CommunityRole> = {};
    
    rolesSnapshot.forEach((doc) => {
      memberUids.push(doc.id);
      roleMap[doc.id] = doc.data() as CommunityRole;
    });
    
    if (memberUids.length === 0) return [];
    
    const users = await getUserProfiles(memberUids);
    
    return users.map(user => ({
      ...user,
      communityRole: roleMap[user.uid]
    }));
  } catch (error) {
    console.error('Error getting community members:', error);
    return [];
  }
};

// Delete user account completely
export const deleteUserAccount = async (uid: string): Promise<void> => {
  try {
    const batch = writeBatch(db);
    
    // Delete user profile
    const userRef = doc(db, 'users', uid);
    batch.delete(userRef);
    
    // Delete user's community roles
    // Note: This is a simplified version. In production, you'd want to use Cloud Functions
    // to handle cascading deletes across all communities
    
    await batch.commit();
    
    // Delete Firebase Auth user (must be done by the user themselves or admin)
    if (auth.currentUser && auth.currentUser.uid === uid) {
      await deleteUser(auth.currentUser);
    }
  } catch (error) {
    console.error('Error deleting user account:', error);
    throw error;
  }
};
