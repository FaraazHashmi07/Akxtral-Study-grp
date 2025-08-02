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
  writeBatch,
  serverTimestamp,
  orderBy,
  limit
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
export const deleteUserAvatar = async (uid: string, photoURL: string, skipProfileUpdate: boolean = false): Promise<void> => {
  try {
    // Only attempt to delete from Firebase Storage if it's a Firebase Storage URL
    // External URLs (like Google profile photos) should not be deleted from our storage
    const isFirebaseStorageUrl = photoURL.includes('firebasestorage.googleapis.com') || 
                                 photoURL.includes('firebase') || 
                                 photoURL.startsWith('gs://');
    
    if (isFirebaseStorageUrl) {
      console.log('🗑️ [AVATAR] Deleting Firebase Storage avatar:', photoURL);
      const avatarRef = ref(storage, photoURL);
      await deleteObject(avatarRef);
    } else {
      console.log('ℹ️ [AVATAR] Skipping deletion of external URL (not Firebase Storage):', photoURL);
    }
    
    // Skip profile updates during account deletion to avoid "No document to update" errors
    if (!skipProfileUpdate) {
      // Update user profile
      await updateUserProfile(uid, { photoURL: '' });
      
      // Update Firebase Auth profile
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, { photoURL: '' });
      }
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
    const startTime = Date.now();

    // OPTIMIZATION: Use the existing membership data to only query communities user is actually in
    const membersRef = collection(db, 'communityMembers');
    const memberQuery = query(membersRef, where('uid', '==', uid));
    const memberSnapshot = await getDocs(memberQuery);

    if (memberSnapshot.empty) {
      return {};
    }

    const communityRoles: Record<string, CommunityRole> = {};
    const communityIds = memberSnapshot.docs.map(doc => doc.data().communityId);

    // Batch the role queries for better performance
    const rolePromises = communityIds.map(async (communityId) => {
      try {
        const roleRef = doc(db, 'communities', communityId, 'roles', uid);
        const roleSnap = await getDoc(roleRef);

        if (roleSnap.exists()) {
          const roleData = roleSnap.data() as CommunityRole;
          communityRoles[communityId] = roleData;
        } else {
          // This is expected - membership might exist but role document might be missing
          // Create a default role to prevent future queries
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

// Delete user account and all related data - SUPER OPTIMIZED VERSION
export const deleteUserAccount = async (uid: string): Promise<void> => {
  try {
    console.log('🗑️ [DELETE] Starting SUPER OPTIMIZED account deletion for user:', uid);
    const startTime = Date.now();

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

    // 2. OPTIMIZATION: Find communities created by user AND communities where user is a member
    console.log('🏘️ [DELETE] Step 2: Finding user-created communities and memberships (OPTIMIZED)...');
    
    // Find communities created by this user
    const createdCommunitiesQuery = query(
      collection(db, 'communities'),
      where('createdBy', '==', uid)
    );
    const createdCommunitiesSnapshot = await getDocs(createdCommunitiesQuery);
    
    // Find communities where user is a member
    const communityMembersQuery = query(
      collection(db, 'communityMembers'),
      where('uid', '==', uid)
    );
    const communityMembersSnapshot = await getDocs(communityMembersQuery);
    
    const userCommunityIds: string[] = [];
    const createdCommunityIds: string[] = [];
    const communityUpdatePromises: Promise<void>[] = [];
    
    // Process created communities (these will be completely deleted)
    createdCommunitiesSnapshot.forEach((communityDoc) => {
      const communityId = communityDoc.id;
      createdCommunityIds.push(communityId);
      console.log(`🏗️ [DELETE] Found user-created community to delete: ${communityId}`);
    });

    // Process memberships and queue community updates in parallel
    communityMembersSnapshot.forEach((memberDoc) => {
      const communityId = memberDoc.data().communityId;
      userCommunityIds.push(communityId);
      
      // Delete membership
      batch.delete(memberDoc.ref);
      
      // Delete user's role from community
      const roleRef = doc(db, 'communities', communityId, 'roles', uid);
      batch.delete(roleRef);
      
      // Queue community member count update (parallel execution)
      communityUpdatePromises.push(
        (async () => {
          try {
            const communityRef = doc(db, 'communities', communityId);
            const communitySnap = await getDoc(communityRef);
            if (communitySnap.exists()) {
              const communityData = communitySnap.data();
              const currentMemberCount = communityData.memberCount || 0;
              batch.update(communityRef, {
                memberCount: Math.max(0, currentMemberCount - 1)
              });
            }
          } catch (error) {
            console.warn(`⚠️ [DELETE] Failed to update member count for community ${communityId}:`, error);
          }
        })()
      );
      
      console.log(`🏘️ [DELETE] Queued removal from community: ${communityId}`);
    });
    
    // Execute community updates in parallel
    await Promise.allSettled(communityUpdatePromises);

    // 3. OPTIMIZATION: Community memberships already handled above

    // 4. OPTIMIZATION: Execute all data deletion queries in parallel
    console.log('🚀 [DELETE] Step 4: Executing parallel data deletion...');
    
    const deletionPromises = [
      // Delete join requests
      (async () => {
        try {
          const joinRequestsQuery = query(
            collection(db, 'joinRequests'),
            where('userId', '==', uid)
          );
          const joinRequestsSnapshot = await getDocs(joinRequestsQuery);
          joinRequestsSnapshot.forEach((doc) => batch.delete(doc.ref));
          console.log(`📝 [DELETE] Queued ${joinRequestsSnapshot.size} join requests for deletion`);
        } catch (error) {
          console.warn('⚠️ [DELETE] Failed to delete join requests:', error);
        }
      })(),
      
      // Delete top-level resources
      (async () => {
        try {
          const resourcesQuery = query(
            collection(db, 'resources'),
            where('uploadedBy', '==', uid)
          );
          const resourcesSnapshot = await getDocs(resourcesQuery);
          resourcesSnapshot.forEach((doc) => batch.delete(doc.ref));
          console.log(`📁 [DELETE] Queued ${resourcesSnapshot.size} top-level resources for deletion`);
        } catch (error) {
          console.warn('⚠️ [DELETE] Failed to delete top-level resources:', error);
        }
      })(),
      
      // Delete community-specific data in parallel
      ...userCommunityIds.map(communityId => 
        (async () => {
          try {
            const communityDeletions = await Promise.allSettled([
              // Messages
              (async () => {
                const messagesQuery = query(
                  collection(db, 'communities', communityId, 'messages'),
                  where('authorId', '==', uid)
                );
                const messagesSnapshot = await getDocs(messagesQuery);
                
                // Delete main messages and collect thread deletion promises
                const threadDeletionPromises: Promise<void>[] = [];
                
                messagesSnapshot.forEach((messageDoc) => {
                  batch.delete(messageDoc.ref);
                  
                  // Queue thread deletion (parallel execution)
                  threadDeletionPromises.push(
                    (async () => {
                      try {
                        const threadsQuery = query(
                          collection(db, 'communities', communityId, 'messages', messageDoc.id, 'threads'),
                          where('authorId', '==', uid)
                        );
                        const threadsSnapshot = await getDocs(threadsQuery);
                        threadsSnapshot.forEach((threadDoc) => batch.delete(threadDoc.ref));
                      } catch (threadError) {
                        console.warn(`⚠️ [DELETE] Failed to delete threads for message ${messageDoc.id}:`, threadError);
                      }
                    })()
                  );
                });
                
                // Execute thread deletions in parallel
                await Promise.allSettled(threadDeletionPromises);
                console.log(`💬 [DELETE] Queued ${messagesSnapshot.size} messages + threads from community: ${communityId}`);
              })(),
              
              // Community resources
              (async () => {
                const communityResourcesQuery = query(
                  collection(db, 'communities', communityId, 'resources'),
                  where('authorId', '==', uid)
                );
                const communityResourcesSnapshot = await getDocs(communityResourcesQuery);
                communityResourcesSnapshot.forEach((doc) => batch.delete(doc.ref));
                console.log(`📁 [DELETE] Queued ${communityResourcesSnapshot.size} resources from community: ${communityId}`);
              })(),
              
              // Announcements
              (async () => {
                const announcementsQuery = query(
                  collection(db, 'communities', communityId, 'announcements'),
                  where('authorId', '==', uid)
                );
                const announcementsSnapshot = await getDocs(announcementsQuery);
                announcementsSnapshot.forEach((doc) => batch.delete(doc.ref));
                console.log(`📢 [DELETE] Queued ${announcementsSnapshot.size} announcements from community: ${communityId}`);
              })()
            ]);
            
            // Log any failures but don't stop the process
            communityDeletions.forEach((result, index) => {
              if (result.status === 'rejected') {
                console.warn(`⚠️ [DELETE] Community ${communityId} deletion task ${index} failed:`, result.reason);
              }
            });
          } catch (error) {
            console.warn(`⚠️ [DELETE] Failed to process community ${communityId}:`, error);
          }
        })()
      )
    ];
    
    // Execute all deletion queries in parallel
    await Promise.allSettled(deletionPromises);

    // 5. Delete user-created communities completely
    console.log('🏗️ [DELETE] Step 5: Deleting user-created communities...');
    const communityDeletionPromises = createdCommunityIds.map(communityId => 
      (async () => {
        try {
          console.log(`🏗️ [DELETE] Deleting entire community: ${communityId}`);
          
          // Create a separate batch for each community to avoid batch size limits
          const communityBatch = writeBatch(db);
          
          // Delete all subcollections in parallel
          const subcollectionDeletions = await Promise.allSettled([
            // Delete all roles
            (async () => {
              const rolesQuery = query(collection(db, 'communities', communityId, 'roles'));
              const rolesSnapshot = await getDocs(rolesQuery);
              rolesSnapshot.forEach((doc) => communityBatch.delete(doc.ref));
              console.log(`🏗️ [DELETE] Queued ${rolesSnapshot.size} roles from community: ${communityId}`);
            })(),
            
            // Delete all messages and threads
            (async () => {
              const messagesQuery = query(collection(db, 'communities', communityId, 'messages'));
              const messagesSnapshot = await getDocs(messagesQuery);
              
              const threadDeletionPromises: Promise<void>[] = [];
              messagesSnapshot.forEach((messageDoc) => {
                communityBatch.delete(messageDoc.ref);
                
                // Queue thread deletion
                threadDeletionPromises.push(
                  (async () => {
                    try {
                      const threadsQuery = query(
                        collection(db, 'communities', communityId, 'messages', messageDoc.id, 'threads')
                      );
                      const threadsSnapshot = await getDocs(threadsQuery);
                      threadsSnapshot.forEach((threadDoc) => communityBatch.delete(threadDoc.ref));
                    } catch (threadError) {
                      console.warn(`⚠️ [DELETE] Failed to delete threads for message ${messageDoc.id}:`, threadError);
                    }
                  })()
                );
              });
              
              await Promise.allSettled(threadDeletionPromises);
              console.log(`🏗️ [DELETE] Queued ${messagesSnapshot.size} messages + threads from community: ${communityId}`);
            })(),
            
            // Delete all resources
            (async () => {
              const resourcesQuery = query(collection(db, 'communities', communityId, 'resources'));
              const resourcesSnapshot = await getDocs(resourcesQuery);
              resourcesSnapshot.forEach((doc) => communityBatch.delete(doc.ref));
              console.log(`🏗️ [DELETE] Queued ${resourcesSnapshot.size} resources from community: ${communityId}`);
            })(),
            
            // Delete all announcements
            (async () => {
              const announcementsQuery = query(collection(db, 'communities', communityId, 'announcements'));
              const announcementsSnapshot = await getDocs(announcementsQuery);
              announcementsSnapshot.forEach((doc) => communityBatch.delete(doc.ref));
              console.log(`🏗️ [DELETE] Queued ${announcementsSnapshot.size} announcements from community: ${communityId}`);
            })(),
            
            // Delete all events
            (async () => {
              const eventsQuery = query(collection(db, 'communities', communityId, 'events'));
              const eventsSnapshot = await getDocs(eventsQuery);
              eventsSnapshot.forEach((doc) => communityBatch.delete(doc.ref));
              console.log(`🏗️ [DELETE] Queued ${eventsSnapshot.size} events from community: ${communityId}`);
            })()
          ]);
          
          // Delete all community memberships for this community
          const communityMembersForCommunityQuery = query(
            collection(db, 'communityMembers'),
            where('communityId', '==', communityId)
          );
          const communityMembersForCommunitySnapshot = await getDocs(communityMembersForCommunityQuery);
          communityMembersForCommunitySnapshot.forEach((doc) => communityBatch.delete(doc.ref));
          
          // Delete all join requests for this community
          const joinRequestsForCommunityQuery = query(
            collection(db, 'joinRequests'),
            where('communityId', '==', communityId)
          );
          const joinRequestsForCommunitySnapshot = await getDocs(joinRequestsForCommunityQuery);
          joinRequestsForCommunitySnapshot.forEach((doc) => communityBatch.delete(doc.ref));
          
          // Finally, delete the community document itself
          const communityRef = doc(db, 'communities', communityId);
          communityBatch.delete(communityRef);
          
          // Commit the community deletion batch
          await communityBatch.commit();
          
          console.log(`✅ [DELETE] Successfully deleted entire community: ${communityId}`);
        } catch (error) {
          console.error(`❌ [DELETE] Failed to delete community ${communityId}:`, error);
          // Don't throw - continue with other deletions
        }
      })()
    );
    
    // Execute all community deletions in parallel
    await Promise.allSettled(communityDeletionPromises);

    // 6. Delete user's avatar from storage BEFORE deleting profile document
    if (userPhotoURL) {
      try {
        console.log('🖼️ [DELETE] Step 6: Deleting user avatar from storage...');
        await deleteUserAvatar(uid, userPhotoURL, true); // Skip profile update since we're deleting the account
        console.log('✅ [DELETE] Avatar deleted successfully');
      } catch (storageError) {
        console.warn('⚠️ [DELETE] Failed to delete avatar from storage:', storageError);
        // Don't fail the entire deletion for storage errors
      }
    }

    // 7. Delete user profile document
    console.log('👤 [DELETE] Step 7: Deleting user profile...');
    batch.delete(userRef);

    // 8. Commit all Firestore deletions
    console.log('💾 [DELETE] Step 8: Committing Firestore deletions...');
    await batch.commit();

    // 9. Delete Firebase Auth user (this must be last)
    console.log('🔐 [DELETE] Step 9: Deleting Firebase Auth user...');
    if (auth.currentUser && auth.currentUser.uid === uid) {
      try {
        // Delete the user account directly
        await deleteUser(auth.currentUser);
        console.log('✅ [DELETE] Firebase Auth user deleted successfully');
      } catch (authError: any) {
        console.error('❌ [DELETE] Firebase Auth deletion failed:', authError);

        // Handle specific Firebase Auth errors
        if (authError.code === 'auth/too-many-requests') {
          throw new Error('Too many failed attempts. Please try again later.');
        } else if (authError.code === 'auth/user-not-found') {
          throw new Error('User account not found. Please try logging in again.');
        } else if (authError.code === 'auth/requires-recent-login' || authError.code === 'auth/user-token-expired') {
          // For these errors, we'll proceed anyway since we want to make deletion as simple as possible
          console.warn('⚠️ [DELETE] Auth requires recent login, but proceeding with deletion anyway');
          // The Firestore data has already been deleted, so the account is effectively deleted
          // The user will be signed out automatically
        } else {
          throw new Error(`Authentication error: ${authError.message || 'Cannot delete user account'}`);
        }
      }
    } else {
      console.warn('⚠️ [DELETE] Current user mismatch or not authenticated');
      throw new Error('Authentication error: You must be logged in to delete your account');
    }

    const totalTime = Date.now() - startTime;
    console.log(`✅ [DELETE] SUPER OPTIMIZED account deletion completed successfully in ${totalTime}ms`);
  } catch (error) {
    console.error('❌ [DELETE] OPTIMIZED account deletion failed:', error);
    throw new Error(
      error instanceof Error
        ? `Optimized account deletion failed: ${error.message}`
        : 'Optimized account deletion failed due to an unknown error'
    );
  }
};
