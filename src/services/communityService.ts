import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  setDoc,
  runTransaction,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Community, CommunityMember, JoinRequest, CommunityFilter } from '../types';
import { uploadCommunityIcon, UploadProgress } from './storageService';

// Collection references
const communitiesRef = collection(db, 'communities');
const membersRef = collection(db, 'communityMembers');
const joinRequestsRef = collection(db, 'joinRequests');
const notificationsRef = collection(db, 'notifications');

// Community CRUD operations
export const createCommunity = async (
  communityData: Partial<Community>,
  creatorId: string,
  creatorEmail?: string,
  creatorDisplayName?: string
): Promise<Community> => {
  console.log('🚀 Creating community with data:', { communityData, creatorId });

  try {
    // Prepare the community document data with explicit visibility handling
    const visibility = communityData.visibility || 'public'; // Force default to public

    const communityDoc = {
      name: communityData.name || '',
      description: communityData.description || '',
      category: communityData.category || 'other',
      visibility: visibility, // Explicitly set visibility
      requiresApproval: communityData.requiresApproval || false,
      tags: communityData.tags || [],
      memberCount: 1,
      createdBy: creatorId,
      admins: [creatorId], // CRITICAL FIX: Add admins array for proper permission tracking
      createdAt: serverTimestamp(),
      lastActivity: serverTimestamp(),
      settings: communityData.settings || {
        allowMemberInvites: true,
        allowFileUploads: true,
        maxFileSize: 10,
        allowedFileTypes: ['pdf', 'doc', 'docx', 'txt', 'jpg', 'png', 'gif']
      },
      bannerUrl: communityData.bannerUrl || null,
      iconUrl: communityData.iconUrl || null
    };

    console.log('📝 [CREATION] Community document to be written:', {
      name: communityDoc.name,
      visibility: communityDoc.visibility,
      category: communityDoc.category,
      createdBy: communityDoc.createdBy,
      tags: communityDoc.tags
    });

    // Verify visibility is set correctly
    if (communityDoc.visibility !== 'public' && communityDoc.visibility !== 'private') {
      console.warn('⚠️ [CREATION] Invalid visibility value, forcing to public:', communityDoc.visibility);
      communityDoc.visibility = 'public';
    }

    console.log('📝 Writing community document to Firestore:', communityDoc);

    // Use transaction to create community and role documents atomically
    const docRef = await runTransaction(db, async (transaction) => {
      // Create the community document
      const communityRef = doc(communitiesRef);
      transaction.set(communityRef, communityDoc);

      // Create membership document
      const membershipRef = doc(membersRef);
      const membershipDoc = {
        uid: creatorId,
        communityId: communityRef.id,
        role: 'community_admin',
        joinedAt: serverTimestamp(),
        lastActive: serverTimestamp(),
        // Include creator profile data
        email: creatorEmail || '',
        displayName: creatorDisplayName || '',
        photoURL: '' // We can add this later if needed
      };
      transaction.set(membershipRef, membershipDoc);

      // Note: Role document will be created later via separate process
      // to avoid security rule conflicts during community creation

      return communityRef;
    });

    console.log('✅ Community and membership documents created atomically with ID:', docRef.id);

    // Create role document separately after a brief delay to ensure community document is committed
    try {
      // Small delay to ensure community document is fully committed
      await new Promise(resolve => setTimeout(resolve, 100));

      const roleRef = doc(db, 'communities', docRef.id, 'roles', creatorId);
      await setDoc(roleRef, {
        role: 'community_admin',
        assignedAt: serverTimestamp(),
        assignedBy: creatorId
      });
      console.log('✅ Creator role document created');
    } catch (roleError) {
      console.warn('⚠️ Failed to create creator role document:', roleError);
      console.warn('Role error details:', roleError);
      // Don't fail the whole operation - the community was created successfully
      // The creator will still be recognized as admin via the createdBy field
    }

    // Return the community object with the generated ID
    const community: Community = {
      id: docRef.id,
      name: communityDoc.name,
      description: communityDoc.description,
      category: communityDoc.category,
      visibility: communityDoc.visibility,
      requiresApproval: communityDoc.requiresApproval,
      tags: communityDoc.tags,
      memberCount: communityDoc.memberCount,
      createdBy: creatorId,
      admins: [creatorId], // Include admins array
      createdAt: new Date(), // Use current date for immediate UI update
      lastActivity: new Date(),
      settings: communityDoc.settings,
      bannerUrl: communityDoc.bannerUrl || undefined,
      iconUrl: communityDoc.iconUrl || undefined
    };

    console.log('🎉 Community creation completed successfully:', community);
    return community;

  } catch (error) {
    console.error('❌ Error creating community:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any)?.code,
      stack: error instanceof Error ? error.stack : undefined
    });
    throw new Error(`Failed to create community: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Creates a community with optional icon upload
 */
export const createCommunityWithIcon = async (
  communityData: Partial<Community>,
  creatorId: string,
  iconFile?: File,
  onProgress?: (progress: UploadProgress) => void,
  creatorEmail?: string,
  creatorDisplayName?: string
): Promise<Community> => {
  console.log('🚀 Creating community with icon:', {
    communityData: { ...communityData, iconFile: iconFile ? iconFile.name : 'none' },
    creatorId
  });

  try {
    let iconUrl: string | null = null;

    // Step 1: Create community first to get the ID
    const community = await createCommunity(
      communityData,
      creatorId,
      creatorEmail,
      creatorDisplayName
    );

    // Step 2: Upload icon if provided
    if (iconFile) {
      console.log('📤 [ICON] Uploading community icon for community:', community.id);

      try {
        const uploadResult = await uploadCommunityIcon(
          community.id,
          iconFile,
          onProgress
        );

        iconUrl = uploadResult.downloadURL;
        console.log('✅ [ICON] Icon uploaded successfully:', iconUrl);

        // Step 3: Update community with icon URL
        const communityRef = doc(db, 'communities', community.id);
        await updateDoc(communityRef, {
          iconUrl: iconUrl
        });

        console.log('✅ [ICON] Community updated with icon URL');

        // Return updated community object
        return {
          ...community,
          iconUrl: iconUrl
        };

      } catch (iconError) {
        console.error('❌ [ICON] Icon upload failed:', iconError);
        // Don't fail the entire operation - community was created successfully
        console.warn('⚠️ [ICON] Community created without icon due to upload failure');
        throw new Error(`Community created but icon upload failed: ${iconError instanceof Error ? iconError.message : 'Unknown error'}`);
      }
    }

    return community;

  } catch (error: any) {
    console.error('❌ Community creation with icon failed:', error);
    throw new Error(`Failed to create community: ${error.message}`);
  }
};

// Get all public communities for discovery (completely rewritten for reliability)
export const getAllPublicCommunities = async (): Promise<Community[]> => {
  console.log('🌍 [DISCOVERY] Starting to fetch ALL public communities...');

  try {
    // Step 1: First try to get ALL communities (no filters) to see what exists
    console.log('📋 [DISCOVERY] Step 1: Getting ALL communities to debug...');
    const allSnapshot = await getDocs(communitiesRef);
    console.log('📊 [DISCOVERY] Total communities in database:', allSnapshot.size);

    // Log all communities for debugging
    const allCommunities: any[] = [];
    allSnapshot.forEach((doc) => {
      const data = doc.data();
      allCommunities.push({
        id: doc.id,
        name: data.name,
        visibility: data.visibility,
        category: data.category,
        createdBy: data.createdBy
      });
    });
    console.log('📋 [DISCOVERY] All communities in database:', allCommunities);

    // Step 2: Filter for public communities manually (client-side filtering)
    console.log('📋 [DISCOVERY] Step 2: Filtering for public communities...');
    const publicCommunities: Community[] = [];

    allSnapshot.forEach((doc) => {
      const data = doc.data();

      // Only process if visibility is 'public'
      if (data.visibility === 'public') {
        // console.log('✅ [DISCOVERY] Found public community:', data.name);

        try {
          const community: Community = {
            id: doc.id,
            name: data.name || '',
            description: data.description || '',
            category: data.category || 'other',
            visibility: data.visibility || 'public',
            requiresApproval: data.requiresApproval || false,
            tags: data.tags || [],
            memberCount: data.memberCount || 0,
            createdBy: data.createdBy || '',
            admins: data.admins || [data.createdBy || ''], // Include admins array with fallback
            createdAt: data.createdAt?.toDate() || new Date(),
            lastActivity: data.lastActivity?.toDate() || new Date(),
            settings: data.settings || {
              allowMemberInvites: true,
              allowFileUploads: true,
              maxFileSize: 10,
              allowedFileTypes: ['pdf', 'doc', 'docx', 'txt', 'jpg', 'png', 'gif']
            },
            bannerUrl: data.bannerUrl || undefined,
            iconUrl: data.iconUrl || undefined
          };

          publicCommunities.push(community);
        } catch (docError) {
          console.error('❌ [DISCOVERY] Error processing public community:', doc.id, docError);
        }
      } else {
        console.log('⏭️ [DISCOVERY] Skipping non-public community:', data.name, 'visibility:', data.visibility);
      }
    });

    // Step 3: Sort by creation date (newest first)
    publicCommunities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // console.log('🎉 [DISCOVERY] Final result:', {
    //   totalInDatabase: allCommunities.length,
    //   publicFound: publicCommunities.length,
    //   publicCommunityNames: publicCommunities.map(c => c.name)
    // });

    return publicCommunities;

  } catch (error) {
    console.error('❌ [DISCOVERY] Critical error in getAllPublicCommunities:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      code: (error as any)?.code,
      stack: error instanceof Error ? error.stack : undefined
    });

    // Return empty array instead of throwing to prevent UI crashes
    return [];
  }
};

// Enhanced getCommunities function with better filtering
export const getCommunities = async (filters?: CommunityFilter): Promise<Community[]> => {
  console.log('🔍 getCommunities called with filters:', filters);

  // For discovery, always use the simple public communities query
  if (filters?.visibility === 'public' || !filters) {
    console.log('📋 Using getAllPublicCommunities for discovery...');
    return getAllPublicCommunities();
  }

  // For other cases, use the original complex query
  try {
    let q = query(communitiesRef);

    // Apply visibility filter
    if (filters.visibility) {
      console.log('👁️ Filtering by visibility:', filters.visibility);
      q = query(q, where('visibility', '==', filters.visibility));
    }

    // Apply category filter only if it's not 'all'
    if (filters.category && filters.category !== 'all') {
      console.log('📂 Filtering by category:', filters.category);
      q = query(q, where('category', '==', filters.category));
    }

    // Apply sorting - default to creation date descending
    const sortField = filters.sortBy === 'activity' ? 'lastActivity' :
                     filters.sortBy === 'members' ? 'memberCount' :
                     'createdAt';
    const sortDirection = filters.sortOrder === 'asc' ? 'asc' : 'desc';
    console.log('📊 Sorting by:', { sortField, sortDirection });
    q = query(q, orderBy(sortField, sortDirection));

    console.log('🔥 Executing complex Firestore query...');
    const snapshot = await getDocs(q);
    console.log('📊 Complex query results:', {
      totalDocs: snapshot.size,
      empty: snapshot.empty
    });

    const communities: Community[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();

      try {
        const community: Community = {
          id: doc.id,
          name: data.name || '',
          description: data.description || '',
          category: data.category || 'other',
          visibility: data.visibility || 'public',
          requiresApproval: data.requiresApproval || false,
          tags: data.tags || [],
          memberCount: data.memberCount || 0,
          createdBy: data.createdBy || '',
          createdAt: data.createdAt?.toDate() || new Date(),
          lastActivity: data.lastActivity?.toDate() || new Date(),
          settings: data.settings || {
            allowMemberInvites: true,
            allowFileUploads: true,
            maxFileSize: 10,
            allowedFileTypes: ['pdf', 'doc', 'docx', 'txt', 'jpg', 'png', 'gif']
          },
          bannerUrl: data.bannerUrl || undefined,
          iconUrl: data.iconUrl || undefined
        };

        communities.push(community);
      } catch (docError) {
        console.error('❌ Error processing document:', doc.id, docError);
      }
    });

    console.log('🎉 Complex query final result:', {
      count: communities.length,
      communities: communities.map(c => ({
        id: c.id,
        name: c.name,
        visibility: c.visibility
      }))
    });

    return communities;

  } catch (error) {
    console.error('❌ Error in complex getCommunities:', error);
    throw new Error(`Failed to fetch communities: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const getUserCommunities = async (userId: string): Promise<Community[]> => {
  try {
    console.log('🔍 [SERVICE] Getting communities for user:', userId);

    // Get user's community memberships
    const membershipQuery = query(membersRef, where('uid', '==', userId));
    const membershipSnapshot = await getDocs(membershipQuery);

    const communityIds = membershipSnapshot.docs.map(doc => doc.data().communityId);
    console.log('📋 [SERVICE] Found', communityIds.length, 'community memberships');

    if (communityIds.length === 0) {
      return [];
    }

    // Optimize: Use batch queries for better performance
    // Firestore 'in' queries support up to 10 items, so we need to chunk
    const communities: Community[] = [];
    const chunkSize = 10;

    for (let i = 0; i < communityIds.length; i += chunkSize) {
      const chunk = communityIds.slice(i, i + chunkSize);
      console.log('🔄 [SERVICE] Loading community chunk:', chunk.length, 'communities');

      try {
        // Use 'in' query for batch fetching
        const batchQuery = query(
          communitiesRef,
          where('__name__', 'in', chunk)
        );
        const batchSnapshot = await getDocs(batchQuery);

        batchSnapshot.forEach((doc) => {
          const data = doc.data();
          communities.push({
            id: doc.id,
            name: data.name,
            description: data.description,
            category: data.category,
            visibility: data.visibility,
            requiresApproval: data.requiresApproval,
            tags: data.tags || [],
            memberCount: data.memberCount || 0,
            createdBy: data.createdBy,
            createdAt: data.createdAt?.toDate() || new Date(),
            lastActivity: data.lastActivity?.toDate() || new Date(),
            settings: data.settings,
            bannerUrl: data.bannerUrl,
            iconUrl: data.iconUrl
          });
        });
      } catch (chunkError) {
        console.error('❌ [SERVICE] Error loading community chunk:', chunkError);
        // Continue with next chunk instead of failing completely
      }
    }

    console.log('✅ [SERVICE] Loaded', communities.length, 'communities for user');
    return communities;
  } catch (error) {
    console.error('❌ [SERVICE] Error fetching user communities:', error);
    throw new Error('Failed to fetch user communities');
  }
};

export const joinCommunity = async (
  communityId: string,
  userId: string,
  message?: string,
  userDisplayName?: string,
  userEmail?: string
): Promise<void> => {
  try {
    console.log('🤝 [SERVICE] Join community request:', { communityId, userId });

    // First, check if user is already a member (check role document - most reliable)
    const roleRef = doc(db, 'communities', communityId, 'roles', userId);
    const existingRole = await getDoc(roleRef);

    if (existingRole.exists()) {
      console.log('⚠️ [SERVICE] User is already a member of this community');
      throw new Error('You are already a member of this community');
    }

    // Check if there's already a pending join request
    const existingRequestQuery = query(
      joinRequestsRef,
      where('userId', '==', userId),
      where('communityId', '==', communityId),
      where('status', '==', 'pending')
    );
    const existingRequest = await getDocs(existingRequestQuery);

    if (!existingRequest.empty) {
      console.log('⚠️ [SERVICE] User already has a pending join request');
      throw new Error('You already have a pending join request for this community');
    }

    // Check if community exists and get its data
    const communityDoc = await getDoc(doc(communitiesRef, communityId));
    if (!communityDoc.exists()) {
      throw new Error('Community not found');
    }

    const communityData = communityDoc.data();
    console.log('📋 [SERVICE] Community data:', {
      name: communityData.name,
      requiresApproval: communityData.requiresApproval
    });

    if (communityData.requiresApproval) {
      console.log('📝 [SERVICE] Creating join request (approval required)');

      const joinRequestData = {
        communityId,
        userId,
        message: message || '',
        status: 'pending',
        createdAt: serverTimestamp(),
        userDisplayName: userDisplayName || '',
        userEmail: userEmail || ''
      };

      console.log('📋 [SERVICE] Join request data to be written:', joinRequestData);

      // Create join request
      const docRef = await addDoc(joinRequestsRef, joinRequestData);
      console.log('✅ [SERVICE] Join request created successfully with ID:', docRef.id);

      // Also store the join request in the community document for easier admin access
      // This is a temporary workaround for security rules issues
      try {
        const communityDocRef = doc(communitiesRef, communityId);
        const communityDoc = await getDoc(communityDocRef);

        if (communityDoc.exists()) {
          const currentData = communityDoc.data();
          const pendingRequests = currentData.pendingJoinRequests || [];

          // Add the new request to the array
          pendingRequests.push({
            id: docRef.id,
            userId,
            userDisplayName: userDisplayName || '',
            userEmail: userEmail || '',
            message: message || '',
            createdAt: new Date(),
            status: 'pending'
          });

          // Update the community document
          await updateDoc(communityDocRef, {
            pendingJoinRequests: pendingRequests,
            pendingRequestsCount: pendingRequests.length
          });

          console.log('✅ [SERVICE] Join request also stored in community document');
        }
      } catch (error) {
        console.warn('⚠️ [SERVICE] Failed to store join request in community document:', error);
        // Don't fail the whole operation if this fails
      }

      console.log('✅ [SERVICE] Join request created successfully');
    } else {
      console.log('🚀 [SERVICE] Joining community directly (no approval required)');

      // CRITICAL FIX: Improved join flow with better race condition handling
      try {
        // First, check if user is already a member using a simple query
        const existingMemberQuery = query(
          membersRef,
          where('uid', '==', userId),
          where('communityId', '==', communityId)
        );
        const existingMemberSnapshot = await getDocs(existingMemberQuery);

        if (!existingMemberSnapshot.empty) {
          throw new Error('You are already a member of this community');
        }

        // Use transaction for atomic operations
        await runTransaction(db, async (transaction) => {
          // Get current community data for member count
          const communityRef = doc(communitiesRef, communityId);
          const communitySnapshot = await transaction.get(communityRef);

          if (!communitySnapshot.exists()) {
            throw new Error('Community not found');
          }

          const currentCommunityData = communitySnapshot.data();

          // Create membership document with composite ID for better querying
          const membershipId = `${userId}_${communityId}`;
          const membershipRef = doc(membersRef, membershipId);
          transaction.set(membershipRef, {
            uid: userId,
            communityId,
            role: 'community_member',
            joinedAt: serverTimestamp(),
            lastActive: serverTimestamp(),
            // Store user profile data for easier access
            email: userEmail || '',
            displayName: userDisplayName || '',
            photoURL: '' // We don't have photoURL in the join parameters, but we can add it later
          });

          // Create role document in community roles subcollection
          const roleRef = doc(db, 'communities', communityId, 'roles', userId);
          transaction.set(roleRef, {
            role: 'community_member',
            assignedAt: serverTimestamp(),
            assignedBy: userId // Self-assigned when joining
          });

          // Update member count
          transaction.update(communityRef, {
            memberCount: (currentCommunityData.memberCount || 0) + 1,
            lastActivity: serverTimestamp()
          });
        });

        console.log('✅ [SERVICE] User joined community successfully (atomic transaction)');
      } catch (transactionError) {
        console.error('❌ [SERVICE] Transaction failed during join:', transactionError);

        // Handle specific transaction errors
        if (transactionError instanceof Error) {
          if (transactionError.message.includes('permission-denied')) {
            throw new Error('Permission denied: Unable to join this community. Please check if the community allows new members.');
          } else if (transactionError.message.includes('already exists')) {
            throw new Error('You are already a member of this community');
          } else {
            throw new Error(`Failed to join community: ${transactionError.message}`);
          }
        } else {
          throw new Error('Failed to join community due to an unexpected error');
        }
      }
    }
  } catch (error) {
    console.error('❌ [SERVICE] Error joining community:', error);
    throw error; // Re-throw the original error to preserve the message
  }
};

export const leaveCommunity = async (communityId: string, userId: string): Promise<void> => {
  try {
    // Find and remove membership
    const membershipQuery = query(
      membersRef, 
      where('uid', '==', userId),
      where('communityId', '==', communityId)
    );
    const membershipSnapshot = await getDocs(membershipQuery);
    
    if (!membershipSnapshot.empty) {
      const memberDoc = membershipSnapshot.docs[0];
      await deleteDoc(memberDoc.ref);

      // Remove role document
      const roleRef = doc(db, 'communities', communityId, 'roles', userId);
      try {
        await deleteDoc(roleRef);
      } catch (roleError) {
        console.warn('Failed to delete role document (may not exist):', roleError);
      }

      // Update member count
      const communityDoc = await getDoc(doc(communitiesRef, communityId));
      if (communityDoc.exists()) {
        const currentCount = communityDoc.data().memberCount || 0;
        await updateDoc(doc(communitiesRef, communityId), {
          memberCount: Math.max(0, currentCount - 1),
          lastActivity: serverTimestamp()
        });
      }
    }
  } catch (error) {
    console.error('Error leaving community:', error);
    throw new Error('Failed to leave community');
  }
};

export const getCommunityMembers = async (communityId: string): Promise<CommunityMember[]> => {
  try {
    const memberQuery = query(membersRef, where('communityId', '==', communityId));
    const memberSnapshot = await getDocs(memberQuery);

    const members: CommunityMember[] = [];
    memberSnapshot.forEach((doc) => {
      const data = doc.data();
      members.push({
        uid: data.uid,
        communityId: data.communityId,
        role: data.role,
        joinedAt: data.joinedAt?.toDate() || new Date(),
        invitedBy: data.invitedBy,
        lastActive: data.lastActive?.toDate() || new Date()
      });
    });

    return members;
  } catch (error) {
    console.error('Error fetching community members:', error);
    throw new Error('Failed to fetch community members');
  }
};

// Get community members with full user profiles
export const getCommunityMembersWithProfiles = async (communityId: string): Promise<Array<CommunityMember & { displayName: string; email: string; photoURL?: string }>> => {
  try {
    console.log('👥 [SERVICE] Loading members with profiles for community:', communityId);

    // Get basic member data
    const members = await getCommunityMembers(communityId);

    if (members.length === 0) {
      return [];
    }

    // Fetch user profiles for each member
    const membersWithProfiles = await Promise.all(
      members.map(async (member) => {
        try {
          const userDoc = await getDoc(doc(db, 'users', member.uid));

          let email = 'Unknown';
          let displayName = 'Unknown User';
          let photoURL = '';

          if (userDoc.exists()) {
            const userData = userDoc.data();
            email = userData.email || 'Unknown';
            displayName = userData.displayName || userData.name || email.split('@')[0] || 'Unknown User';
            photoURL = userData.photoURL || '';
          }

          return {
            ...member,
            email,
            displayName,
            photoURL
          };
        } catch (error) {
          console.error(`❌ [SERVICE] Error fetching profile for ${member.uid}:`, error);
          return {
            ...member,
            email: 'Error loading',
            displayName: 'Error loading user',
            photoURL: ''
          };
        }
      })
    );

    console.log('✅ [SERVICE] Successfully loaded member profiles:', membersWithProfiles.length);
    return membersWithProfiles;
  } catch (error) {
    console.error('❌ [SERVICE] Failed to load community members with profiles:', error);
    throw new Error('Failed to fetch community members with profiles');
  }
};

// Remove a member from community (admin only)
export const removeCommunityMember = async (
  communityId: string,
  memberUid: string,
  adminUid: string
): Promise<void> => {
  try {
    console.log('🗑️ [SERVICE] Removing member:', memberUid, 'from community:', communityId, 'by admin:', adminUid);

    // Verify admin permissions - check if user is creator or has admin role
    const communityDoc = await getDoc(doc(communitiesRef, communityId));
    if (!communityDoc.exists()) {
      throw new Error('Community not found');
    }

    const communityData = communityDoc.data();
    const isCreator = communityData.createdBy === adminUid;

    // Check if user has admin role in the community
    let hasAdminRole = false;
    try {
      const adminMemberQuery = query(
        membersRef,
        where('uid', '==', adminUid),
        where('communityId', '==', communityId),
        where('role', '==', 'community_admin')
      );
      const adminSnapshot = await getDocs(adminMemberQuery);
      hasAdminRole = !adminSnapshot.empty;
    } catch (roleError) {
      console.warn('⚠️ [SERVICE] Could not check admin role in members collection:', roleError);
    }

    const isAdmin = isCreator || hasAdminRole;

    if (!isAdmin) {
      throw new Error('You do not have permission to remove members from this community');
    }

    // Find and delete the membership document
    const membershipQuery = query(
      membersRef,
      where('uid', '==', memberUid),
      where('communityId', '==', communityId)
    );

    const membershipSnapshot = await getDocs(membershipQuery);

    if (membershipSnapshot.empty) {
      throw new Error('Member not found in community');
    }

    // Delete the membership document
    const memberDoc = membershipSnapshot.docs[0];
    await deleteDoc(memberDoc.ref);

    // Update community member count
    const communityRef = doc(communitiesRef, communityId);
    const communityDocForUpdate = await getDoc(communityRef);

    if (communityDocForUpdate.exists()) {
      const currentCount = communityDocForUpdate.data().memberCount || 0;
      await updateDoc(communityRef, {
        memberCount: Math.max(0, currentCount - 1),
        lastActivity: serverTimestamp()
      });
    }

    console.log('✅ [SERVICE] Member removed successfully');
  } catch (error) {
    console.error('❌ [SERVICE] Failed to remove member:', error);
    throw error;
  }
};

export const getJoinRequests = async (communityId: string): Promise<JoinRequest[]> => {
  try {
    const requestQuery = query(
      joinRequestsRef, 
      where('communityId', '==', communityId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );
    const requestSnapshot = await getDocs(requestQuery);
    
    const requests: JoinRequest[] = [];
    requestSnapshot.forEach((doc) => {
      const data = doc.data();
      requests.push({
        id: doc.id,
        communityId: data.communityId,
        userId: data.userId,
        message: data.message,
        status: data.status,
        createdAt: data.createdAt?.toDate() || new Date(),
        reviewedAt: data.reviewedAt?.toDate(),
        reviewedBy: data.reviewedBy
      });
    });

    return requests;
  } catch (error) {
    console.error('Error fetching join requests:', error);
    throw new Error('Failed to fetch join requests');
  }
};

export const approveJoinRequest = async (requestId: string, reviewerId: string): Promise<void> => {
  try {
    const requestDoc = await getDoc(doc(joinRequestsRef, requestId));
    if (!requestDoc.exists()) {
      throw new Error('Join request not found');
    }

    const requestData = requestDoc.data();
    
    // CRITICAL FIX: Add user as member with composite ID for consistency
    const membershipId = `${requestData.userId}_${requestData.communityId}`;
    const membershipRef = doc(membersRef, membershipId);
    await setDoc(membershipRef, {
      uid: requestData.userId,
      communityId: requestData.communityId,
      role: 'community_member',
      joinedAt: serverTimestamp(),
      lastActive: serverTimestamp(),
      // Include user profile data from the join request
      email: requestData.userEmail || '',
      displayName: requestData.userDisplayName || '',
      photoURL: '' // We don't have photoURL in join requests, but we can add it later
    });

    // Create role document in community roles subcollection
    const roleRef = doc(db, 'communities', requestData.communityId, 'roles', requestData.userId);
    await setDoc(roleRef, {
      role: 'community_member',
      assignedAt: serverTimestamp(),
      assignedBy: reviewerId // Assigned by the admin who approved
    });

    // Update join request status
    await updateDoc(doc(joinRequestsRef, requestId), {
      status: 'approved',
      reviewedAt: serverTimestamp(),
      reviewedBy: reviewerId
    });

    // Update community member count and remove from pending requests
    const communityDoc = await getDoc(doc(communitiesRef, requestData.communityId));
    let communityName = 'Unknown Community';

    if (communityDoc.exists()) {
      const currentData = communityDoc.data();
      const currentCount = currentData.memberCount || 0;
      communityName = currentData.name || 'Unknown Community'; // Get name here
      const pendingRequests = (currentData.pendingJoinRequests || []).filter(
        (req: any) => req.id !== requestId
      );

      await updateDoc(doc(communitiesRef, requestData.communityId), {
        memberCount: currentCount + 1,
        lastActivity: serverTimestamp(),
        pendingJoinRequests: pendingRequests,
        pendingRequestsCount: pendingRequests.length
      });
    }

    // Send notification to the user (reusing communityName from above)

    await createUserNotification(
      requestData.userId,
      'join_request_approved',
      'Join Request Approved! 🎉',
      `Your request to join "${communityName}" has been approved. Welcome to the community!`,
      {
        communityId: requestData.communityId,
        communityName,
        requestId
      }
    );

  } catch (error) {
    console.error('Error approving join request:', error);
    throw new Error('Failed to approve join request');
  }
};

export const rejectJoinRequest = async (requestId: string, reviewerId: string): Promise<void> => {
  try {
    // Get the request data first
    const requestDoc = await getDoc(doc(joinRequestsRef, requestId));
    if (!requestDoc.exists()) {
      throw new Error('Join request not found');
    }

    const requestData = requestDoc.data();

    // Update join request status
    await updateDoc(doc(joinRequestsRef, requestId), {
      status: 'rejected',
      reviewedAt: serverTimestamp(),
      reviewedBy: reviewerId
    });

    // Remove from community pending requests
    const communityDoc = await getDoc(doc(communitiesRef, requestData.communityId));
    let communityName = 'Unknown Community';

    if (communityDoc.exists()) {
      const currentData = communityDoc.data();
      communityName = currentData.name || 'Unknown Community'; // Get name here
      const pendingRequests = (currentData.pendingJoinRequests || []).filter(
        (req: any) => req.id !== requestId
      );

      await updateDoc(doc(communitiesRef, requestData.communityId), {
        pendingJoinRequests: pendingRequests,
        pendingRequestsCount: pendingRequests.length
      });
    }

    // Send notification to the user (reusing communityName from above)

    await createUserNotification(
      requestData.userId,
      'join_request_rejected',
      'Join Request Update',
      `Your request to join "${communityName}" was not approved at this time. You may try again later or contact the community administrators.`,
      {
        communityId: requestData.communityId,
        communityName,
        requestId
      }
    );

  } catch (error) {
    console.error('Error rejecting join request:', error);
    throw new Error('Failed to reject join request');
  }
};

// Get pending join requests for a community (for admins)
export const getPendingJoinRequests = async (communityId: string): Promise<JoinRequest[]> => {
  try {
    console.log('📋 [SERVICE] Getting pending join requests for community:', communityId);

    // First try to get from community document (workaround for security rules)
    try {
      const communityDocRef = doc(communitiesRef, communityId);
      const communityDoc = await getDoc(communityDocRef);

      if (communityDoc.exists()) {
        const data = communityDoc.data();
        const pendingRequests = data.pendingJoinRequests || [];

        console.log('✅ [SERVICE] Got pending requests from community document:', pendingRequests);

        // Convert to JoinRequest format
        const requests: JoinRequest[] = pendingRequests.map((req: any) => ({
          id: req.id,
          userId: req.userId,
          communityId: communityId,
          status: req.status,
          message: req.message,
          createdAt: req.createdAt instanceof Date ? req.createdAt : new Date(req.createdAt),
          userDisplayName: req.userDisplayName,
          userEmail: req.userEmail
        }));

        return requests;
      }
    } catch (communityError) {
      console.warn('⚠️ [SERVICE] Failed to get requests from community document, trying direct query:', communityError);
    }

    // Fallback to direct query
    const q = query(
      joinRequestsRef,
      where('communityId', '==', communityId),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    console.log('📋 [SERVICE] Executing query for pending requests...');
    const snapshot = await getDocs(q);

    console.log('📊 [SERVICE] Raw query results:', {
      size: snapshot.size,
      empty: snapshot.empty,
      docs: snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }))
    });

    const requests: JoinRequest[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      console.log('📄 [SERVICE] Processing document:', { id: doc.id, data });

      requests.push({
        id: doc.id,
        userId: data.userId,
        communityId: data.communityId,
        status: data.status,
        message: data.message,
        createdAt: data.createdAt?.toDate() || new Date(),
        reviewedAt: data.reviewedAt?.toDate(),
        reviewedBy: data.reviewedBy,
        userDisplayName: data.userDisplayName,
        userEmail: data.userEmail
      });
    });

    console.log('✅ [SERVICE] Found pending requests:', requests.length, requests);
    return requests;

  } catch (error) {
    console.error('❌ [SERVICE] Error getting pending join requests:', error);
    console.error('❌ [SERVICE] Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });

    // If it's a permission error, provide more context
    if (error.code === 'permission-denied') {
      console.warn('⚠️ [SERVICE] Permission denied - this might be due to Firestore security rules');
      console.warn('⚠️ [SERVICE] Make sure the user has admin permissions for this community');
      throw new Error('Permission denied: Unable to access join requests. Make sure you have admin permissions.');
    }

    throw new Error(`Failed to get pending join requests: ${error.message}`);
  }
};

// Get count of pending join requests for a community (for notification badges)
// Create a notification for a user
const createUserNotification = async (
  userId: string,
  type: 'join_request_approved' | 'join_request_rejected' | 'community_deleted',
  title: string,
  message: string,
  data?: any
): Promise<void> => {
  try {
    // Extract communityId from data for top-level field (required by Firestore rules)
    const communityId = data?.communityId;
    
    const notificationDoc = {
      userId,
      type,
      title,
      message,
      data: data || {},
      read: false,
      createdAt: serverTimestamp()
    };
    
    // Add communityId as top-level field if available (required for admin permission check)
    if (communityId) {
      notificationDoc.communityId = communityId;
    }
    
    await addDoc(notificationsRef, notificationDoc);
    console.log('✅ [NOTIFICATION] Created notification for user:', userId, type);
  } catch (error) {
    console.error('❌ [NOTIFICATION] Failed to create notification:', error);
    // Don't throw error to avoid breaking the main operation
  }
};



// Update community details (admin only)
export const updateCommunity = async (
  communityId: string,
  updates: Partial<Community>,
  adminUserId: string
): Promise<void> => {
  try {
    console.log('🔄 [SERVICE] Updating community:', communityId, 'Updates:', updates);

    // Validate input parameters
    if (!communityId || typeof communityId !== 'string' || communityId.trim() === '') {
      throw new Error('Invalid community ID provided');
    }

    if (!adminUserId || typeof adminUserId !== 'string' || adminUserId.trim() === '') {
      throw new Error('Invalid admin user ID provided');
    }

    // Get the community document for admin verification
    const communityDoc = await getDoc(doc(communitiesRef, communityId));
    if (!communityDoc.exists()) {
      throw new Error('Community not found');
    }

    const communityData = communityDoc.data();

    // Check if user is the community creator
    const isCreator = communityData.createdBy === adminUserId;

    // Check if user has admin role in the community
    let hasAdminRole = false;
    try {
      const roleDoc = await getDoc(doc(db, 'communities', communityId, 'roles', adminUserId));
      hasAdminRole = roleDoc.exists() && roleDoc.data()?.role === 'community_admin';
    } catch (roleError) {
      console.warn('⚠️ [SERVICE] Could not check admin role:', roleError);
    }

    const isAdmin = isCreator || hasAdminRole;

    if (!isAdmin) {
      throw new Error('Only community administrators can update community settings');
    }

    console.log('✅ [SERVICE] Admin verification passed, proceeding with update');

    // Prepare update data with timestamp
    const updateData = {
      ...updates,
      lastActivity: serverTimestamp()
    };

    // Remove any undefined values
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    // Update the community document
    await updateDoc(doc(communitiesRef, communityId), updateData);

    console.log('✅ [SERVICE] Community updated successfully');

  } catch (error) {
    console.error('❌ [SERVICE] Failed to update community:', error);
    throw error;
  }
};

/**
 * Updates a community with optional icon upload
 */
export const updateCommunityWithIcon = async (
  communityId: string,
  updates: Partial<Community>,
  adminUserId: string,
  iconFile?: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<void> => {
  console.log('🔄 [SERVICE] Updating community with icon:', {
    communityId,
    updates,
    iconFile: iconFile ? iconFile.name : 'none'
  });

  try {
    let iconUrl: string | undefined;

    // Step 1: Upload icon if provided
    if (iconFile) {
      console.log('📤 [SERVICE] Uploading community icon...');
      try {
        const uploadResult = await uploadCommunityIcon(communityId, iconFile, onProgress);
        iconUrl = uploadResult.downloadURL;
        console.log('✅ [SERVICE] Icon uploaded successfully:', iconUrl);
      } catch (iconError) {
        console.error('❌ [SERVICE] Icon upload failed:', iconError);
        throw new Error(`Icon upload failed: ${iconError instanceof Error ? iconError.message : 'Unknown error'}`);
      }
    }

    // Step 2: Prepare update data with icon URL if uploaded
    const updateData = {
      ...updates,
      ...(iconUrl && { iconUrl })
    };

    // Step 3: Update community document
    await updateCommunity(communityId, updateData, adminUserId);

    console.log('✅ [SERVICE] Community updated with icon successfully');

  } catch (error: any) {
    console.error('❌ [SERVICE] Community update with icon failed:', error);
    throw new Error(`Failed to update community: ${error.message}`);
  }
};

// Delete a community and all associated data
export const deleteCommunity = async (communityId: string, adminUserId: string): Promise<void> => {
  try {
    console.log('🗑️ [SERVICE] Starting community deletion:', communityId);

    // Validate input parameters
    if (!communityId || typeof communityId !== 'string' || communityId.trim() === '') {
      throw new Error('Invalid community ID provided');
    }

    if (!adminUserId || typeof adminUserId !== 'string' || adminUserId.trim() === '') {
      throw new Error('Invalid admin user ID provided');
    }

    // Get the community document for admin verification
    const communityDoc = await getDoc(doc(communitiesRef, communityId));
    if (!communityDoc.exists()) {
      throw new Error('Community not found');
    }

    const communityData = communityDoc.data();

    // Check if user is the community creator
    const isCreator = communityData.createdBy === adminUserId;

    // Check if user has admin role in the community
    let hasAdminRole = false;
    try {
      const roleDoc = await getDoc(doc(db, 'communities', communityId, 'roles', adminUserId));
      hasAdminRole = roleDoc.exists() && roleDoc.data()?.role === 'community_admin';
    } catch (roleError) {
      console.warn('⚠️ [SERVICE] Could not check admin role:', roleError);
    }

    const isAdmin = isCreator || hasAdminRole;

    if (!isAdmin) {
      throw new Error('Only community administrators can delete communities');
    }

    console.log('✅ [SERVICE] Admin verification passed, proceeding with deletion');

    // Get all community members to notify them
    const membersQuery = query(membersRef, where('communityId', '==', communityId));
    const membersSnapshot = await getDocs(membersQuery);
    const memberIds: string[] = [];

    membersSnapshot.forEach((doc) => {
      const memberData = doc.data();
      if (memberData.uid !== adminUserId) { // Don't notify the admin who deleted it
        memberIds.push(memberData.uid);
      }
    });

    console.log('📬 [SERVICE] Will notify', memberIds.length, 'members about deletion');

    // Delete all associated data in parallel
    const deletionPromises = [
      // Delete all members
      ...membersSnapshot.docs.map(doc => deleteDoc(doc.ref)),

      // Delete all join requests
      getDocs(query(joinRequestsRef, where('communityId', '==', communityId)))
        .then(snapshot => Promise.all(snapshot.docs.map(doc => deleteDoc(doc.ref)))),

      // Delete community document
      deleteDoc(doc(communitiesRef, communityId))
    ];

    await Promise.all(deletionPromises);

    // Send notifications to all members
    const notificationPromises = memberIds.map(userId =>
      createUserNotification(
        userId,
        'community_deleted',
        'Community Deleted',
        `The community "${communityData.name}" has been deleted by its administrator.`,
        {
          communityId,
          communityName: communityData.name,
          deletedBy: adminUserId
        }
      )
    );

    await Promise.all(notificationPromises);

    console.log('✅ [SERVICE] Community deletion completed successfully');

  } catch (error) {
    console.error('❌ [SERVICE] Failed to delete community:', error);
    throw error;
  }
};

// Check if user has a pending join request for a specific community
export const checkUserPendingJoinRequest = async (communityId: string, userId: string): Promise<boolean> => {
  try {
    console.log('🔍 [SERVICE] Checking pending join request for user:', { communityId, userId });

    const existingRequestQuery = query(
      joinRequestsRef,
      where('userId', '==', userId),
      where('communityId', '==', communityId),
      where('status', '==', 'pending')
    );
    const existingRequest = await getDocs(existingRequestQuery);

    const hasPendingRequest = !existingRequest.empty;
    console.log('✅ [SERVICE] Pending request check result:', hasPendingRequest);
    return hasPendingRequest;
  } catch (error) {
    console.error('❌ [SERVICE] Error checking pending join request:', error);
    return false; // Return false on error to allow join attempt
  }
};

export const getPendingJoinRequestsCount = async (communityId: string): Promise<number> => {
  try {
    console.log('🔍 [SERVICE] Getting pending join requests count for community:', communityId);

    // First try to get from community document (workaround for security rules)
    try {
      const communityDocRef = doc(communitiesRef, communityId);
      const communityDoc = await getDoc(communityDocRef);

      if (communityDoc.exists()) {
        const data = communityDoc.data();
        const count = data.pendingRequestsCount || 0;
        console.log('✅ [SERVICE] Got pending requests count from community document:', count);
        return count;
      }
    } catch (communityError) {
      console.warn('⚠️ [SERVICE] Failed to get count from community document, trying direct query:', communityError);
    }

    // Fallback to direct query
    const q = query(
      joinRequestsRef,
      where('communityId', '==', communityId),
      where('status', '==', 'pending')
    );

    console.log('📋 [SERVICE] Executing query for pending requests...');
    const snapshot = await getDocs(q);

    console.log('📊 [SERVICE] Query results:', {
      size: snapshot.size,
      docs: snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }))
    });

    return snapshot.size;

  } catch (error) {
    console.error('❌ [SERVICE] Error getting pending join requests count:', error);
    console.error('❌ [SERVICE] Error details:', {
      code: error.code,
      message: error.message,
      stack: error.stack
    });

    // If it's a permission error, it might be due to security rules
    if (error.code === 'permission-denied') {
      console.warn('⚠️ [SERVICE] Permission denied - this might be due to Firestore security rules');
      console.warn('⚠️ [SERVICE] Make sure the user has admin permissions for this community');
    }

    return 0;
  }
};

// Real-time subscription functions

// Subscribe to a specific community's changes
export const subscribeToCommunity = (
  communityId: string,
  callback: (community: Community | null) => void
): Unsubscribe => {
  console.log('🔔 [SERVICE] Subscribing to community changes:', communityId);
  
  const communityRef = doc(communitiesRef, communityId);
  
  return onSnapshot(communityRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      const community: Community = {
        id: doc.id,
        name: data.name,
        description: data.description,
        category: data.category,
        visibility: data.visibility,
        requiresApproval: data.requiresApproval,
        tags: data.tags || [],
        memberCount: data.memberCount,
        createdBy: data.createdBy,
        admins: data.admins || [data.createdBy],
        createdAt: data.createdAt?.toDate() || new Date(),
        lastActivity: data.lastActivity?.toDate() || new Date(),
        settings: data.settings,
        bannerUrl: data.bannerUrl,
        iconUrl: data.iconUrl
      };
      callback(community);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('❌ [SERVICE] Error in community subscription:', error);
    callback(null);
  });
};

// Subscribe to user's joined communities
export const subscribeToUserCommunities = (
  userId: string,
  callback: (communities: Community[]) => void
): Unsubscribe => {
  console.log('🔔 [SERVICE] Subscribing to user communities:', userId);
  
  // First, subscribe to user's memberships
  const membershipQuery = query(membersRef, where('uid', '==', userId));
  
  return onSnapshot(membershipQuery, async (membershipSnapshot) => {
    try {
      const communityIds = membershipSnapshot.docs.map(doc => doc.data().communityId);
      
      if (communityIds.length === 0) {
        callback([]);
        return;
      }
      
      // Get communities in batches (Firestore 'in' query limit is 10)
      const communities: Community[] = [];
      const chunkSize = 10;
      
      for (let i = 0; i < communityIds.length; i += chunkSize) {
        const chunk = communityIds.slice(i, i + chunkSize);
        const communityQuery = query(
          communitiesRef,
          where('__name__', 'in', chunk)
        );
        
        const communitySnapshot = await getDocs(communityQuery);
        
        communitySnapshot.docs.forEach(doc => {
          const data = doc.data();
          communities.push({
            id: doc.id,
            name: data.name,
            description: data.description,
            category: data.category,
            visibility: data.visibility,
            requiresApproval: data.requiresApproval,
            tags: data.tags || [],
            memberCount: data.memberCount,
            createdBy: data.createdBy,
            admins: data.admins || [data.createdBy],
            createdAt: data.createdAt?.toDate() || new Date(),
            lastActivity: data.lastActivity?.toDate() || new Date(),
            settings: data.settings,
            bannerUrl: data.bannerUrl,
            iconUrl: data.iconUrl
          });
        });
      }
      
      callback(communities);
    } catch (error) {
      console.error('❌ [SERVICE] Error in user communities subscription:', error);
      callback([]);
    }
  }, (error) => {
    console.error('❌ [SERVICE] Error in membership subscription:', error);
    callback([]);
  });
};

// Subscribe to all public communities for discovery
export const subscribeToPublicCommunities = (
  callback: (communities: Community[]) => void
): Unsubscribe => {
  console.log('🔔 [SERVICE] Subscribing to public communities');
  
  const publicQuery = query(
    communitiesRef,
    where('visibility', '==', 'public'),
    orderBy('lastActivity', 'desc')
  );
  
  return onSnapshot(publicQuery, (snapshot) => {
    const communities: Community[] = [];
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      communities.push({
        id: doc.id,
        name: data.name,
        description: data.description,
        category: data.category,
        visibility: data.visibility,
        requiresApproval: data.requiresApproval,
        tags: data.tags || [],
        memberCount: data.memberCount,
        createdBy: data.createdBy,
        admins: data.admins || [data.createdBy],
        createdAt: data.createdAt?.toDate() || new Date(),
        lastActivity: data.lastActivity?.toDate() || new Date(),
        settings: data.settings,
        bannerUrl: data.bannerUrl,
        iconUrl: data.iconUrl
      });
    });
    
    callback(communities);
  }, (error) => {
     console.error('❌ [SERVICE] Error in public communities subscription:', error);
     callback([]);
   });
 };

// Subscribe to community members
export const subscribeToCommunityMembers = (
  communityId: string,
  callback: (members: CommunityMember[]) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  console.log('🔔 [SERVICE] Subscribing to community members:', communityId);
  
  const membersQuery = query(membersRef, where('communityId', '==', communityId));
  
  return onSnapshot(membersQuery, (snapshot) => {
    const members: CommunityMember[] = [];
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      members.push({
        uid: data.uid,
        communityId: data.communityId,
        role: data.role,
        joinedAt: data.joinedAt?.toDate() || new Date(),
        lastActive: data.lastActive?.toDate() || new Date(),
        email: data.email || '',
        displayName: data.displayName || '',
        photoURL: data.photoURL || ''
      });
    });
    
    callback(members);
  }, (error) => {
    console.error('❌ [SERVICE] Error in community members subscription:', error);
    if (onError) onError(error);
  });
};

// Subscribe to community document updates
export const subscribeToCommunityUpdates = (
  communityId: string,
  callback: (community: Community) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  console.log('🔔 [SERVICE] Subscribing to community document updates:', communityId);
  
  const communityRef = doc(communitiesRef, communityId);
  
  return onSnapshot(communityRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      const community: Community = {
        id: doc.id,
        name: data.name,
        description: data.description,
        category: data.category,
        visibility: data.visibility,
        requiresApproval: data.requiresApproval,
        tags: data.tags || [],
        memberCount: data.memberCount,
        createdBy: data.createdBy,
        admins: data.admins || [data.createdBy],
        createdAt: data.createdAt?.toDate() || new Date(),
        lastActivity: data.lastActivity?.toDate() || new Date(),
        settings: data.settings,
        bannerUrl: data.bannerUrl,
        iconUrl: data.iconUrl
      };
      callback(community);
    }
  }, (error) => {
    console.error('❌ [SERVICE] Error in community updates subscription:', error);
    if (onError) onError(error);
  });
 };
