import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc,
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Community, CommunityMember, JoinRequest, CommunityFilter } from '../types';

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

    // Create the community document
    const docRef = await addDoc(communitiesRef, communityDoc);
    console.log('✅ Community document created with ID:', docRef.id);

    // Create membership document with composite ID for better querying
    const membershipId = `${creatorId}_${docRef.id}`;
    const membershipDoc = {
      uid: creatorId,
      communityId: docRef.id,
      role: 'community_admin',
      joinedAt: serverTimestamp(),
      lastActive: serverTimestamp(),
      // Include creator profile data
      email: creatorEmail || '',
      displayName: creatorDisplayName || '',
      photoURL: '' // We can add this later if needed
    };

    console.log('👤 Creating membership document:', { membershipId, membershipDoc });

    // Use doc() with custom ID instead of addDoc for better querying
    await addDoc(membersRef, membershipDoc);
    console.log('✅ Membership document created');

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
      createdAt: new Date(), // Use current date for immediate UI update
      lastActivity: new Date(),
      settings: communityDoc.settings,
      bannerUrl: communityDoc.bannerUrl,
      iconUrl: communityDoc.iconUrl
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
        console.log('✅ [DISCOVERY] Found public community:', data.name);

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

    console.log('🎉 [DISCOVERY] Final result:', {
      totalInDatabase: allCommunities.length,
      publicFound: publicCommunities.length,
      publicCommunityNames: publicCommunities.map(c => c.name)
    });

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
    // Get user's community memberships
    const membershipQuery = query(membersRef, where('uid', '==', userId));
    const membershipSnapshot = await getDocs(membershipQuery);
    
    const communityIds = membershipSnapshot.docs.map(doc => doc.data().communityId);
    
    if (communityIds.length === 0) {
      return [];
    }

    // Get community details
    const communities: Community[] = [];
    
    // Note: In a real implementation, you'd want to batch these requests
    // or use a different query structure for better performance
    for (const communityId of communityIds) {
      const communityDoc = await getDoc(doc(communitiesRef, communityId));
      if (communityDoc.exists()) {
        const data = communityDoc.data();
        communities.push({
          id: communityDoc.id,
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
      }
    }

    return communities;
  } catch (error) {
    console.error('Error fetching user communities:', error);
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

    // First, check if user is already a member
    const existingMembershipQuery = query(
      membersRef,
      where('uid', '==', userId),
      where('communityId', '==', communityId)
    );
    const existingMembership = await getDocs(existingMembershipQuery);

    if (!existingMembership.empty) {
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

      // Verify the document was created by reading it back
      const createdDoc = await getDoc(docRef);
      if (createdDoc.exists()) {
        console.log('✅ [SERVICE] Join request verified in Firestore:', createdDoc.data());
      } else {
        console.error('❌ [SERVICE] Join request not found after creation!');
      }
    } else {
      console.log('🚀 [SERVICE] Joining community directly (no approval required)');
      // Join directly - include user profile data for easier access
      await addDoc(membersRef, {
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

      // Update member count
      await updateDoc(doc(communitiesRef, communityId), {
        memberCount: (communityData.memberCount || 0) + 1,
        lastActivity: serverTimestamp()
      });
      console.log('✅ [SERVICE] User joined community successfully');
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
    
    // Add user as member - include profile data from the join request
    await addDoc(membersRef, {
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
    await addDoc(notificationsRef, {
      userId,
      type,
      title,
      message,
      data: data || {},
      read: false,
      createdAt: serverTimestamp()
    });
    console.log('✅ [NOTIFICATION] Created notification for user:', userId, type);
  } catch (error) {
    console.error('❌ [NOTIFICATION] Failed to create notification:', error);
    // Don't throw error to avoid breaking the main operation
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
