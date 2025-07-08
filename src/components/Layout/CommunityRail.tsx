import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Home, Settings } from 'lucide-react';
import { useCommunityStore } from '../../store/communityStore';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { Community } from '../../types';

export const CommunityRail: React.FC = () => {
  const { joinedCommunities, activeCommunity, setActiveCommunity } = useCommunityStore();
  const {
    setActiveCommunity: setUIActiveCommunity,
    openModal,
    setCommandPaletteOpen
  } = useUIStore();
  const { user } = useAuthStore();

  const [hoveredCommunity, setHoveredCommunity] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  const handleCommunitySelect = (community: Community) => {
    if (isSelecting) return; // Prevent multiple rapid clicks

    console.log('🏢 [RAIL] Community selected:', community.name, community.id);
    setIsSelecting(true);

    try {
      // Set UI state immediately for responsiveness
      setUIActiveCommunity(community.id);

      // Then set the community data
      setActiveCommunity(community);

      console.log('✅ [RAIL] Community selection completed');
    } finally {
      // Reset selection state after a brief delay
      setTimeout(() => setIsSelecting(false), 300);
    }
  };

  const handleCreateCommunity = () => {
    openModal('createCommunity');
  };

  const handleDiscoverCommunities = () => {
    openModal('discoverCommunities');
  };

  const handleSearch = () => {
    setCommandPaletteOpen(true);
  };

  const getUserRole = (community: Community) => {
    return user?.communityRoles?.[community.id]?.role || 'community_member';
  };

  const isAdmin = (community: Community) => {
    return getUserRole(community) === 'community_admin';
  };

  return (
    <div className="w-16 bg-gray-900 dark:bg-gray-950 flex flex-col items-center py-3 space-y-2">
      {/* Home/Dashboard Button */}
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          console.log('🏠 [RAIL] Home button clicked - clearing active community');

          // Clear both stores in the correct order
          // First clear the UI store (this triggers MainContent re-render)
          setUIActiveCommunity(null);

          // Then clear the community store
          setActiveCommunity(null);

          // Force a small delay to ensure state propagation
          setTimeout(() => {
            console.log('✅ [RAIL] Home navigation completed - states cleared');
          }, 50);
        }}
        className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${
          !activeCommunity
            ? 'bg-blue-600 text-white rounded-xl'
            : 'bg-gray-700 hover:bg-blue-600 text-gray-300 hover:text-white hover:rounded-xl'
        }`}
        title="Home"
      >
        <Home size={20} />
      </motion.button>

      {/* Separator */}
      <div className="w-8 h-0.5 bg-gray-700 rounded-full" />

      {/* Joined Communities */}
      <div className="flex flex-col space-y-2 flex-1 overflow-y-auto scrollbar-hide">
        {joinedCommunities.map((community) => (
          <CommunityAvatar
            key={community.id}
            community={community}
            isActive={activeCommunity?.id === community.id}
            isAdmin={isAdmin(community)}
            onClick={() => handleCommunitySelect(community)}
            onHover={setHoveredCommunity}
          />
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col space-y-2 mt-auto">
        {/* Discover Communities */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleDiscoverCommunities}
          className="w-12 h-12 rounded-2xl bg-gray-700 hover:bg-green-600 text-gray-300 hover:text-white flex items-center justify-center transition-all duration-200 hover:rounded-xl"
          title="Discover Communities"
        >
          <Search size={20} />
        </motion.button>

        {/* Create Community */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleCreateCommunity}
          className="w-12 h-12 rounded-2xl bg-gray-700 hover:bg-green-600 text-gray-300 hover:text-white flex items-center justify-center transition-all duration-200 hover:rounded-xl"
          title="Create Community"
        >
          <Plus size={20} />
        </motion.button>

        {/* Settings */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => openModal('userSettings')}
          className="w-12 h-12 rounded-2xl bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white flex items-center justify-center transition-all duration-200 hover:rounded-xl"
          title="User Settings"
        >
          <Settings size={16} />
        </motion.button>
      </div>

      {/* Hover Tooltip */}
      <AnimatePresence>
        {hoveredCommunity && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="fixed left-20 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg z-50 pointer-events-none"
            style={{
              top: '50%',
              transform: 'translateY(-50%)'
            }}
          >
            {hoveredCommunity}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

interface CommunityAvatarProps {
  community: Community;
  isActive: boolean;
  isAdmin: boolean;
  onClick: () => void;
  onHover: (name: string | null) => void;
}

const CommunityAvatar: React.FC<CommunityAvatarProps> = ({
  community,
  isActive,
  isAdmin,
  onClick,
  onHover
}) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getCommunityColor = (category: string) => {
    const colors = {
      'mathematics': 'bg-blue-600',
      'physics': 'bg-purple-600',
      'chemistry': 'bg-green-600',
      'biology': 'bg-emerald-600',
      'computer-science': 'bg-indigo-600',
      'engineering': 'bg-orange-600',
      'literature': 'bg-pink-600',
      'history': 'bg-yellow-600',
      'other': 'bg-gray-600'
    };
    return colors[category as keyof typeof colors] || colors.other;
  };

  return (
    <div className="relative">
      {/* Active indicator */}
      <motion.div
        initial={false}
        animate={{
          height: isActive ? 40 : 0,
          opacity: isActive ? 1 : 0
        }}
        className="absolute -left-1 top-1/2 transform -translate-y-1/2 w-1 bg-white rounded-r-full"
      />

      {/* Admin crown indicator */}
      {isAdmin && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center z-10">
          <span className="text-xs">👑</span>
        </div>
      )}

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        onMouseEnter={() => onHover(community.name)}
        onMouseLeave={() => onHover(null)}
        className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-semibold text-sm transition-all duration-200 relative overflow-hidden ${
          isActive
            ? 'rounded-xl shadow-lg'
            : 'hover:rounded-xl'
        } ${getCommunityColor(community.category)}`}
        title={community.name}
      >
        {community.iconUrl ? (
          <img
            src={community.iconUrl}
            alt={community.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <span>{getInitials(community.name)}</span>
        )}

        {/* Unread indicator */}
        {/* TODO: Add unread message count when implemented */}
      </motion.button>
    </div>
  );
};
