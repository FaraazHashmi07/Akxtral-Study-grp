import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Users, Tag, Eye, Lock, RefreshCw } from 'lucide-react';
import { BaseModal } from '../UI/ModalContainer';
import { useCommunityStore } from '../../store/communityStore';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { Community, CommunityFilter } from '../../types';

export const DiscoverCommunitiesModal: React.FC = () => {
  const { discoverCommunities, joinCommunity, joinedCommunities, isUserMemberOfCommunity, checkMembershipDirect, loadJoinedCommunities } = useCommunityStore();
  const { closeModal, showToast } = useUIStore();
  const { user } = useAuthStore();

  const [communities, setCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [joiningCommunities, setJoiningCommunities] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState<CommunityFilter>({
    category: undefined,
    visibility: 'public',
    sortBy: 'memberCount',
    sortOrder: 'desc'
  });

  const categories = [
    { value: '', label: 'All Categories' },
    { value: 'mathematics', label: 'Mathematics' },
    { value: 'physics', label: 'Physics' },
    { value: 'chemistry', label: 'Chemistry' },
    { value: 'biology', label: 'Biology' },
    { value: 'computer-science', label: 'Computer Science' },
    { value: 'engineering', label: 'Engineering' },
    { value: 'literature', label: 'Literature' },
    { value: 'history', label: 'History' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    // Load communities when modal opens or filters change
    loadCommunities();
  }, [filters]);

  // Load user memberships when modal opens
  useEffect(() => {
    console.log('🔄 [MODAL] Discovery modal opened, loading user memberships first...');

    // Ensure we don't interfere with sidebar state
    const loadData = async () => {
      try {
        await loadUserMemberships();
        console.log('✅ [MODAL] User memberships loaded, now loading communities...');
        await loadCommunities();
      } catch (error) {
        console.error('❌ [MODAL] Failed to load modal data:', error);
        setLoading(false);
      }
    };

    loadData();
  }, []); // Empty dependency array means this runs once when component mounts

  const loadUserMemberships = async () => {
    if (!user) return;

    try {
      console.log('👤 [MODAL] Loading user memberships for:', user.uid);

      // Use cached data if available, don't force reload unless necessary
      await loadJoinedCommunities(true); // Don't force refresh

      console.log('📋 [MODAL] User\'s joined communities after reload:', joinedCommunities.map(c => c.id));
    } catch (error) {
      console.error('❌ [MODAL] Failed to load user memberships:', error);
    }
  };

  const loadCommunities = async () => {
    console.log('🔄 [MODAL] Starting fresh community discovery...');
    setLoading(true);

    try {
      // Force a fresh fetch every time - bypass any caching
      console.log('📋 [MODAL] Calling discoverCommunities with fresh request...');
      const allPublicCommunities = await discoverCommunities({});

      console.log('📊 [MODAL] Discovery result:', {
        totalFound: allPublicCommunities.length,
        communityNames: allPublicCommunities.map(c => c.name)
      });

      if (allPublicCommunities.length === 0) {
        console.log('⚠️ [MODAL] No public communities found!');
        showToast({
          type: 'warning',
          title: 'No Communities Found',
          message: 'No public communities are available for discovery. Try creating one first!'
        });
        setCommunities([]);
        return;
      }

      // Apply client-side filtering
      let filteredCommunities = [...allPublicCommunities];

      // Filter out communities the user has already joined
      const originalCount = filteredCommunities.length;
      filteredCommunities = filteredCommunities.filter(community => {
        const isMember = isUserMemberOfCommunity(community.id);
        console.log(`🔍 [MODAL] Community "${community.name}" (${community.id}): isMember = ${isMember}`);
        return !isMember;
      });
      console.log(`👤 [MODAL] Membership filter: ${originalCount} → ${filteredCommunities.length} (removed ${originalCount - filteredCommunities.length} joined communities)`);

      // Filter by category if specified
      if (filters.category && filters.category !== 'all') {
        const categoryOriginalCount = filteredCommunities.length;
        filteredCommunities = filteredCommunities.filter(community =>
          community.category === filters.category
        );
        console.log(`📂 [MODAL] Category filter (${filters.category}): ${categoryOriginalCount} → ${filteredCommunities.length}`);
      }

      // Filter by search term if specified
      if (filters.search && filters.search.trim()) {
        const searchTerm = filters.search.toLowerCase().trim();
        const originalCount = filteredCommunities.length;
        filteredCommunities = filteredCommunities.filter(community =>
          community.name.toLowerCase().includes(searchTerm) ||
          community.description.toLowerCase().includes(searchTerm) ||
          community.tags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
        console.log(`🔍 [MODAL] Search filter (${searchTerm}): ${originalCount} → ${filteredCommunities.length}`);
      }

      // Sort by creation date (newest first)
      filteredCommunities.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      console.log('✅ [MODAL] Final communities for display:', {
        count: filteredCommunities.length,
        names: filteredCommunities.map(c => c.name)
      });

      setCommunities(filteredCommunities);

      // Show success message if communities found
      if (filteredCommunities.length > 0) {
        console.log('🎉 [MODAL] Successfully loaded communities for discovery');
      }

    } catch (error) {
      console.error('❌ [MODAL] Critical error loading communities:', error);
      showToast({
        type: 'error',
        title: 'Failed to load communities',
        message: error instanceof Error ? error.message : 'Please try again later'
      });
      setCommunities([]);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinCommunity = async (community: Community) => {
    console.log('🤝 [MODAL] Attempting to join community:', community.name);

    // Prevent multiple simultaneous join attempts for the same community
    if (joiningCommunities.has(community.id)) {
      console.log('⏳ [MODAL] Join request already in progress for:', community.name);
      return;
    }

    // Double-check membership with direct Firestore query for accuracy
    const isAlreadyMember = await checkMembershipDirect(community.id);
    if (isAlreadyMember) {
      console.log('⚠️ [MODAL] User is already a member of this community (direct check)');
      showToast({
        type: 'warning',
        title: 'Already a Member',
        message: `You are already a member of ${community.name}`
      });
      return;
    }

    // Add community to joining set to prevent double-clicks
    setJoiningCommunities(prev => new Set([...prev, community.id]));

    try {
      await joinCommunity(community.id, undefined); // message is undefined for now
      console.log('✅ [MODAL] Successfully joined community:', community.name);

      showToast({
        type: 'success',
        title: community.requiresApproval ? 'Join Request Sent' : 'Joined Community',
        message: community.requiresApproval
          ? `Your request to join ${community.name} has been sent for approval`
          : `Welcome to ${community.name}!`
      });

      // Force refresh the community list to immediately reflect the joined community
      console.log('🔄 [MODAL] Force refreshing community list after join...');
      await loadJoinedCommunities(true); // Force refresh to get latest data
      await loadCommunities(); // Reload discovery list

      if (!community.requiresApproval) {
        // Don't close modal immediately, let user see the updated list
        setTimeout(() => closeModal(), 1500);
      }
    } catch (error) {
      console.error('❌ [MODAL] Failed to join community:', error);
      showToast({
        type: 'error',
        title: 'Failed to join community',
        message: error instanceof Error ? error.message : 'Please try again'
      });
    } finally {
      // Always remove community from joining set when done
      setJoiningCommunities(prev => {
        const newSet = new Set(prev);
        newSet.delete(community.id);
        return newSet;
      });
    }
  };

  const filteredCommunities = communities.filter(community =>
    community.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    community.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    community.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getCommunityColor = (category: string) => {
    const colors = {
      'mathematics': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'physics': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'chemistry': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'biology': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
      'computer-science': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      'engineering': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'literature': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      'history': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'other': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    };
    return colors[category as keyof typeof colors] || colors.other;
  };

  return (
    <BaseModal title="Discover Communities" size="xl">
      <div className="p-6 space-y-6">
        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="flex space-x-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search communities..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                showFilters
                  ? 'bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900 dark:border-blue-600 dark:text-blue-300'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600'
              }`}
              title="Toggle Filters"
            >
              <Filter size={20} />
            </button>

            <button
              onClick={loadCommunities}
              disabled={loading}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              title="Refresh Communities"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    value={filters.category || ''}
                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value || undefined }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    {categories.map(category => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sort By
                  </label>
                  <select
                    value={filters.sortBy}
                    onChange={(e) => setFilters(prev => ({ ...prev, sortBy: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="memberCount">Member Count</option>
                    <option value="activity">Activity</option>
                    <option value="created">Recently Created</option>
                    <option value="name">Name</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Order
                  </label>
                  <select
                    value={filters.sortOrder}
                    onChange={(e) => setFilters(prev => ({ ...prev, sortOrder: e.target.value as any }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="desc">High to Low</option>
                    <option value="asc">Low to High</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Communities List */}
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredCommunities.length === 0 ? (
            <div className="text-center py-12">
              <Users size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No communities found
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredCommunities.map((community) => (
                <CommunityCard
                  key={community.id}
                  community={community}
                  onJoin={() => handleJoinCommunity(community)}
                  getCommunityColor={getCommunityColor}
                  isJoining={joiningCommunities.has(community.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </BaseModal>
  );
};

interface CommunityCardProps {
  community: Community;
  onJoin: () => void;
  getCommunityColor: (category: string) => string;
  isJoining?: boolean;
}

const CommunityCard: React.FC<CommunityCardProps> = ({ community, onJoin, getCommunityColor, isJoining = false }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center text-white font-semibold">
              {community.iconUrl ? (
                <img
                  src={community.iconUrl}
                  alt={community.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                community.name.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center space-x-2">
                <span>{community.name}</span>
                {community.visibility === 'private' ? (
                  <Lock size={16} className="text-gray-400" />
                ) : (
                  <Eye size={16} className="text-gray-400" />
                )}
              </h3>
              <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                <Users size={14} />
                <span>{community.memberCount} members</span>
                <span className={`px-2 py-1 rounded-full text-xs ${getCommunityColor(community.category)}`}>
                  {community.category.replace('-', ' ')}
                </span>
              </div>
            </div>
          </div>

          <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
            {community.description}
          </p>

          {community.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {community.tags.slice(0, 3).map(tag => (
                <span
                  key={tag}
                  className="inline-flex items-center px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded-full"
                >
                  <Tag size={10} className="mr-1" />
                  {tag}
                </span>
              ))}
              {community.tags.length > 3 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  +{community.tags.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>

        <button
          onClick={onJoin}
          disabled={isJoining}
          className={`ml-4 px-4 py-2 text-white text-sm rounded-lg transition-colors flex items-center space-x-2 ${
            isJoining
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isJoining && (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          <span>
            {isJoining
              ? 'Joining...'
              : community.requiresApproval
                ? 'Request to Join'
                : 'Join'
            }
          </span>
        </button>
      </div>
    </motion.div>
  );
};
