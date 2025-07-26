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

// Update user profile in Firestore
export const updateUserProfile = async (uid: string, updates: Partial<User>): Promise<void> => {
  try {
    console.log('🔄 [PROFILE] Updating user profile in Firestore:', uid, updates);

    const userRef = doc(db, 'users', uid);

    // Prepare the update data
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp()
    };

    // Remove undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    await updateDoc(userRef, updateData);
    console.log('✅ [PROFILE] User profile updated successfully in Firestore');
  } catch (error: any) {
    console.error('❌ [PROFILE] Error updating user profile:', error);

    // Handle specific Firestore errors
    if (error.code === 'permission-denied') {
      throw new Error('Permission denied: You can only update your own profile');
    } else if (error.code === 'not-found') {
      throw new Error('User profile not found');
    } else {
      throw new Error(`Failed to update profile: ${error.message || 'Unknown error'}`);
    }
  }
};

// Delete user account and all related data comprehensively
export const deleteUserAccount = async (uid: string): Promise<void> => {
  try {
    console.log('🗑️ [DELETE] Starting comprehensive account deletion for user:', uid);

    const batch = writeBatch(db);

    // 1. Get user profile to check for avatar
    console.log('📋 [DELETE] Step 1: Getting user profile...');
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    let userPhotoURL = '';

    if (userSnap.exists()) {
      const userData = userSnap.data();
      userPhotoURL = userData.photoURL || '';
    }

    // 2. Get all communities where user is a member
    console.log('🏘️ [DELETE] Step 2: Finding user communities...');
    const communitiesQuery = query(collection(db, 'communities'));
    const communitiesSnapshot = await getDocs(communitiesQuery);

    const userCommunityIds: string[] = [];

    for (const communityDoc of communitiesSnapshot.docs) {
      const communityId = communityDoc.id;

      // Check if user is a member of this community
      const memberRef = doc(db, 'communities', communityId, 'members', uid);
      const memberSnap = await getDoc(memberRef);

      if (memberSnap.exists()) {
        userCommunityIds.push(communityId);

        // Remove user from community members
        batch.delete(memberRef);

        // Update community member count
        const communityData = communityDoc.data();
        const currentMemberCount = communityData.memberCount || 0;
        batch.update(communityDoc.ref, {
          memberCount: Math.max(0, currentMemberCount - 1)
        });

        console.log(`🏘️ [DELETE] Removing user from community: ${communityId}`);
      }
    }

    // 3. Delete all join requests by this user
    console.log('📝 [DELETE] Step 3: Deleting join requests...');
    const joinRequestsQuery = query(
      collection(db, 'joinRequests'),
      where('uid', '==', uid)
    );
    const joinRequestsSnapshot = await getDocs(joinRequestsQuery);

    joinRequestsSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
      console.log(`📝 [DELETE] Deleting join request: ${doc.id}`);
    });

    // 4. Delete user's messages from all communities
    console.log('💬 [DELETE] Step 4: Deleting user messages...');
    for (const communityId of userCommunityIds) {
      // Delete messages in main chat
      const messagesQuery = query(
        collection(db, 'communities', communityId, 'messages'),
        where('senderId', '==', uid)
      );
      const messagesSnapshot = await getDocs(messagesQuery);

      messagesSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      // Delete thread messages
      const threadMessagesQuery = query(
        collection(db, 'communities', communityId, 'threadMessages'),
        where('senderId', '==', uid)
      );
      const threadMessagesSnapshot = await getDocs(threadMessagesQuery);

      threadMessagesSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });

      console.log(`💬 [DELETE] Deleted messages from community: ${communityId}`);
    }

    // 5. Delete user's resources
    console.log('📁 [DELETE] Step 5: Deleting user resources...');
    const resourcesQuery = query(
      collection(db, 'resources'),
      where('uploadedBy', '==', uid)
    );
    const resourcesSnapshot = await getDocs(resourcesQuery);

    resourcesSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    console.log(`📁 [DELETE] Deleted ${resourcesSnapshot.size} resources`);

    // 6. Delete user's announcements
    console.log('📢 [DELETE] Step 6: Deleting user announcements...');
    const announcementsQuery = query(
      collection(db, 'announcements'),
      where('authorId', '==', uid)
    );
    const announcementsSnapshot = await getDocs(announcementsQuery);

    announcementsSnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });
    console.log(`📢 [DELETE] Deleted ${announcementsSnapshot.size} announcements`);

    // 7. Delete user profile document
    console.log('👤 [DELETE] Step 7: Deleting user profile...');
    batch.delete(userRef);

    // 8. Commit all Firestore deletions
    console.log('💾 [DELETE] Step 8: Committing Firestore deletions...');
    await batch.commit();

    // 9. Delete user's avatar from storage
    if (userPhotoURL) {
      console.log('🖼️ [DELETE] Step 9: Deleting user avatar from storage...');
      try {
        await deleteUserAvatar(uid, userPhotoURL);
      } catch (storageError) {
        console.warn('⚠️ [DELETE] Failed to delete avatar from storage:', storageError);
        // Don't fail the entire deletion for storage errors
      }
    }

    // 10. Delete Firebase Auth user (this must be last)
    console.log('🔐 [DELETE] Step 10: Deleting Firebase Auth user...');
    if (auth.currentUser && auth.currentUser.uid === uid) {
      try {
        await deleteUser(auth.currentUser);
        console.log('✅ [DELETE] Firebase Auth user deleted successfully');
      } catch (authError: any) {
        console.error('❌ [DELETE] Firebase Auth deletion failed:', authError);

        // Handle specific Firebase Auth errors
        if (authError.code === 'auth/requires-recent-login') {
          throw new Error('For security reasons, please log out and log back in before deleting your account.');
        } else if (authError.code === 'auth/user-token-expired') {
          throw new Error('Your session has expired. Please log out and log back in before deleting your account.');
        } else {
          throw new Error(`Authentication error: ${authError.message || 'Cannot delete user account'}`);
        }
      }
    } else {
      console.warn('⚠️ [DELETE] Current user mismatch or not authenticated');
      throw new Error('Authentication error: You must be logged in to delete your account');
    }

    console.log('✅ [DELETE] Account deletion completed successfully');
  } catch (error) {
    console.error('❌ [DELETE] Account deletion failed:', error);
    throw new Error(
      error instanceof Error
        ? `Account deletion failed: ${error.message}`
        : 'Account deletion failed due to an unknown error'
    );
  }
};
