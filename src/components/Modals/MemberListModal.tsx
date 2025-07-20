import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  User,
  Mail,
  Calendar,
  Shield,
  UserMinus,
  AlertTriangle,
  Clock,
  Crown,
  Trash2
} from 'lucide-react';
import { BaseModal } from '../UI/ModalContainer';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useCommunityStore } from '../../store/communityStore';

interface MemberListModalProps {
  communityId: string;
}

interface CommunityMemberWithProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: 'community_admin' | 'community_member';
  joinedAt: Date;
  lastActive?: Date;
}

export const MemberListModal: React.FC<MemberListModalProps> = ({ communityId }) => {
  const { closeModal, showToast } = useUIStore();
  const { user } = useAuthStore();
  const { activeCommunity } = useCommunityStore();

  const [members, setMembers] = useState<CommunityMemberWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState<string | null>(null);

  // Check if current user is admin of this community
  const isCurrentUserAdmin = activeCommunity?.createdBy === user?.uid ||
    members.find(m => m.uid === user?.uid)?.role === 'community_admin';

  useEffect(() => {
    loadCommunityMembers();
  }, [communityId]);

  const loadCommunityMembers = async () => {
    setLoading(true);
    try {
      console.log('👥 [MEMBER_MODAL] Loading members for community:', communityId);

      // Import Firestore functions
      const { collection, getDocs, query, where, doc, getDoc } = await import('firebase/firestore');
      const { db } = await import('../../lib/firebase');

      // Try to get members from communityMembers collection first
      let membersSnapshot;
      try {
        const membersQuery = query(
          collection(db, 'communityMembers'),
          where('communityId', '==', communityId)
        );
        membersSnapshot = await getDocs(membersQuery);
        console.log(`📊 [MEMBER_MODAL] Found ${membersSnapshot.size} members in communityMembers collection`);
      } catch (error) {
        console.warn('⚠️ [MEMBER_MODAL] Could not access communityMembers collection:', error);

        // Fallback: try to get members from community roles subcollection
        try {
          console.log('🔄 [MEMBER_MODAL] Trying community roles subcollection as fallback...');
          const rolesQuery = query(collection(db, 'communities', communityId, 'roles'));
          const rolesSnapshot = await getDocs(rolesQuery);

          if (rolesSnapshot.empty) {
            console.log('⚠️ [MEMBER_MODAL] No members found in roles subcollection either');
            setMembers([]);
            setLoading(false);
            return;
          }

          // Convert roles data to member format
          const roleMembers = rolesSnapshot.docs.map(roleDoc => ({
            uid: roleDoc.id,
            communityId: communityId,
            role: roleDoc.data().role || 'community_member',
            joinedAt: roleDoc.data().joinedAt || new Date(),
            lastActive: roleDoc.data().lastActive
          }));

          // Create a fake snapshot-like structure
          membersSnapshot = {
            empty: false,
            size: roleMembers.length,
            docs: roleMembers.map(member => ({
              data: () => member
            }))
          };

          console.log(`📊 [MEMBER_MODAL] Found ${roleMembers.length} members in roles subcollection`);
        } catch (rolesError) {
          console.error('❌ [MEMBER_MODAL] Could not access roles subcollection either:', rolesError);
          setMembers([]);
          setLoading(false);
          return;
        }
      }

      if (membersSnapshot.empty) {
        console.log('⚠️ [MEMBER_MODAL] No members found');
        setMembers([]);
        setLoading(false);
        return;
      }

      // Fetch user profiles for each member
      const memberProfiles: CommunityMemberWithProfile[] = await Promise.all(
        membersSnapshot.docs.map(async (memberDoc) => {
          const memberData = memberDoc.data();
          const uid = memberData.uid;

          console.log(`👤 [MEMBER_MODAL] Processing member ${uid}:`, {
            hasEmail: !!memberData.email,
            hasDisplayName: !!memberData.displayName,
            email: memberData.email,
            displayName: memberData.displayName,
            role: memberData.role
          });

          // First, try to use data from the communityMembers document itself
          let email = memberData.email || '';
          let displayName = memberData.displayName || memberData.name || '';
          let photoURL = memberData.photoURL || '';

          // If this is the current user, use their authenticated data first
          if (uid === user?.uid && user) {
            console.log(`👤 [MEMBER_MODAL] Using current user authenticated data for ${uid}`);
            email = user.email || email;
            displayName = user.displayName || displayName;
            photoURL = user.photoURL || photoURL;
          }

          // Try to get additional user data if we still don't have complete information
          if (!email || !displayName) {
            try {
              console.log(`🔍 [MEMBER_MODAL] Fetching additional profile data for ${uid}`);

              // Try the users collection with better error handling
              try {
                const userDoc = await getDoc(doc(db, 'users', uid));

                if (userDoc.exists()) {
                  const userData = userDoc.data();
                  email = userData.email || email;
                  displayName = userData.displayName || userData.name || displayName;
                  photoURL = userData.photoURL || photoURL;

                  console.log(`✅ [MEMBER_MODAL] Successfully fetched profile from users collection for ${uid}`);
                } else {
                  console.warn(`⚠️ [MEMBER_MODAL] User profile not found in users collection for UID: ${uid}`);
                }
              } catch (userError) {
                console.warn(`⚠️ [MEMBER_MODAL] Could not access users collection for ${uid}:`, userError);
                // Continue with fallback logic below
              }
            } catch (error) {
              console.warn(`⚠️ [MEMBER_MODAL] Error in profile fetching for ${uid}:`, error);
            }
          }

          // Smart fallback logic for display name
          if (!displayName || displayName.trim() === '' ||
              displayName === 'Unknown User' || displayName === 'Unknown' ||
              displayName === 'Error loading user' || displayName.startsWith('Member ')) {

            displayName = generateDisplayName(email, uid);
            console.log(`📧 [MEMBER_MODAL] Generated display name for ${uid}: ${displayName}`);
          }

          // Smart fallback logic for email
          if (!email || email.trim() === '') {
            email = 'Email not available';
          }

          // Final cleanup
          displayName = displayName.trim();
          if (!displayName) {
            displayName = 'Community Member';
          }

          const memberProfile = {
            uid,
            email,
            displayName,
            photoURL,
            role: memberData.role || 'community_member',
            joinedAt: memberData.joinedAt?.toDate() || new Date(),
            lastActive: memberData.lastActive?.toDate()
          };

          console.log(`✅ [MEMBER_MODAL] Final member profile for ${uid}:`, {
            displayName: memberProfile.displayName,
            email: memberProfile.email,
            role: memberProfile.role
          });

          return memberProfile;
        })
      );

      // Sort members: admins first, then by join date
      const sortedMembers = memberProfiles.sort((a, b) => {
        if (a.role === 'community_admin' && b.role !== 'community_admin') return -1;
        if (b.role === 'community_admin' && a.role !== 'community_admin') return 1;
        return a.joinedAt.getTime() - b.joinedAt.getTime();
      });

      console.log('✅ [MEMBER_MODAL] Successfully loaded member profiles:', sortedMembers.length);
      setMembers(sortedMembers);
    } catch (error) {
      console.error('❌ [MEMBER_MODAL] Failed to load community members:', error);
      showToast('Failed to load community members', 'error');
      setMembers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberUid: string, memberName: string) => {
    if (!isCurrentUserAdmin) {
      showToast('You do not have permission to remove members', 'error');
      return;
    }

    if (memberUid === user?.uid) {
      showToast('You cannot remove yourself from the community', 'error');
      return;
    }

    setRemovingMember(memberUid);
    try {
      console.log('🗑️ [MEMBER_MODAL] Removing member:', memberUid, 'from community:', communityId);

      // Import Firestore functions
      const { collection, query, where, getDocs, deleteDoc, doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../../lib/firebase');

      // Find and delete the membership document
      const membershipQuery = query(
        collection(db, 'communityMembers'),
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
      const communityRef = doc(db, 'communities', communityId);
      const communityDoc = await import('firebase/firestore').then(({ getDoc }) => getDoc(communityRef));

      if (communityDoc.exists()) {
        const currentCount = communityDoc.data().memberCount || 0;
        await updateDoc(communityRef, {
          memberCount: Math.max(0, currentCount - 1),
          lastActivity: serverTimestamp()
        });
      }

      // Remove member from local state
      setMembers(prev => prev.filter(m => m.uid !== memberUid));

      showToast(`${memberName} has been removed from the community`, 'success');
      console.log('✅ [MEMBER_MODAL] Member removed successfully');
    } catch (error) {
      console.error('❌ [MEMBER_MODAL] Failed to remove member:', error);
      showToast('Failed to remove member', 'error');
    } finally {
      setRemovingMember(null);
      setShowRemoveConfirm(null);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'community_admin':
        return <Crown className="w-4 h-4 text-yellow-500" />;
      default:
        return <User className="w-4 h-4 text-gray-500" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'community_admin':
        return 'Admin';
      default:
        return 'Member';
    }
  };

  const generateDisplayName = (email: string, uid: string): string => {
    if (email && email.includes('@')) {
      const emailUsername = email.split('@')[0];
      return emailUsername.charAt(0).toUpperCase() + emailUsername.slice(1);
    }
    return 'Community Member';
  };

  const formatJoinDate = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Joined today';
    if (diffDays <= 7) return `Joined ${diffDays} days ago`;
    if (diffDays <= 30) return `Joined ${Math.ceil(diffDays / 7)} weeks ago`;
    if (diffDays <= 365) return `Joined ${Math.ceil(diffDays / 30)} months ago`;
    return `Joined ${Math.ceil(diffDays / 365)} years ago`;
  };

  return (
    <BaseModal title="Community Members" size="lg">
      <div className="p-6">
        {/* Header with member count */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            <span className="text-lg font-medium text-gray-900 dark:text-white">
              {loading ? 'Loading...' : `${members.length} ${members.length === 1 ? 'Member' : 'Members'}`}
            </span>
          </div>
          {isCurrentUserAdmin && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Admin privileges enabled
            </div>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading members...</span>
          </div>
        )}

        {/* Empty state */}
        {!loading && members.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No members in this community yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Members will appear here once they join the community.
            </p>
          </div>
        )}

        {/* Members list */}
        {!loading && members.length > 0 && (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {members.map((member) => (
              <motion.div
                key={member.uid}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {/* Avatar */}
                  <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                    {member.photoURL ? (
                      <img
                        src={member.photoURL}
                        alt={member.displayName}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      <User size={20} className="text-gray-600 dark:text-gray-300" />
                    )}
                  </div>

                  {/* Member info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="font-medium text-gray-900 dark:text-white truncate">
                        {member.displayName}
                      </span>
                      {getRoleIcon(member.role)}
                      <span className="text-xs px-2 py-1 bg-gray-200 dark:bg-gray-600 rounded-full text-gray-700 dark:text-gray-300">
                        {getRoleLabel(member.role)}
                      </span>
                      {member.uid === user?.uid && (
                        <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full">
                          You
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex items-center space-x-1">
                        <Mail size={12} />
                        <span className="truncate">{member.email}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar size={12} />
                        <span>{formatJoinDate(member.joinedAt)}</span>
                      </div>
                      {member.lastActive && (
                        <div className="flex items-center space-x-1">
                          <Clock size={12} />
                          <span>Active {member.lastActive.toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Admin actions */}
                {isCurrentUserAdmin && member.uid !== user?.uid && (
                  <div className="flex items-center space-x-2 ml-4">
                    {showRemoveConfirm === member.uid ? (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleRemoveMember(member.uid, member.displayName)}
                          disabled={removingMember === member.uid}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          {removingMember === member.uid ? 'Removing...' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => setShowRemoveConfirm(null)}
                          disabled={removingMember === member.uid}
                          className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowRemoveConfirm(member.uid)}
                        className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title={`Remove ${member.displayName} from community`}
                      >
                        <UserMinus size={16} />
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* Refresh button */}
        {!loading && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={loadCommunityMembers}
              className="px-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            >
              Refresh Members
            </button>
          </div>
        )}
      </div>
    </BaseModal>
  );
};
