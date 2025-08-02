import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Home, Crown } from 'lucide-react';
import { useCommunityStore } from '../../store/communityStore';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { isCommunityAdmin } from '../../lib/authorization';
import { Community } from '../../types';

// Discord-style CSS for the community rail
const discordRailStyles = `
  :root {
    --accent-color: #5865F2;
    --rail-bg: #1E1F22;
    --icon-default: #36393F;
    --icon-hover: #4F545C;
    --text-muted: #B9BBBE;
    --text-bright: #DCDDDE;
  }

  .discord-rail {
    width: 72px;
    background-color: var(--rail-bg);
    padding: 12px 8px;
    position: relative;
    overflow: hidden;
    height: 100vh;
    display: flex;
    flex-direction: column;
  }

  .discord-rail .communities-container {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    scroll-behavior: smooth;
    scrollbar-width: none;
    -ms-overflow-style: none;
    position: relative;
    min-height: 0;
    max-height: calc(100vh - 200px);
    padding-bottom: 8px;
  }

  .discord-rail .communities-container::-webkit-scrollbar {
    display: none;
  }

  .discord-icon-container {
    position: relative;
    margin-bottom: 8px;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 48px;
    height: 48px;
  }

  .discord-icon {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background-color: var(--icon-default);
    color: var(--text-muted);
    border: none;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 600;
    font-size: 16px;
    transition: all 150ms ease-out;
    position: relative;
    overflow: hidden;
  }

  .discord-icon:hover {
    background-color: var(--icon-hover);
    color: var(--text-bright);
    border-radius: 16px;
    transform: scale(1.05);
  }

  .discord-icon.active {
    background-color: var(--accent-color);
    color: white;
    border-radius: 16px;
  }

  .discord-icon.active:hover {
    background-color: var(--accent-color);
    color: white;
  }

  .active-indicator {
    position: absolute;
    left: -8px;
    top: 0;
    width: 4px;
    height: 48px;
    background-color: var(--accent-color);
    border-radius: 0 2px 2px 0;
    transition: all 200ms ease-out;
    z-index: 20;
  }

  .discord-rail .active-indicator {
    animation: slideIn 200ms ease-out;
  }

  @keyframes slideIn {
    from {
      opacity: 0;
      transform: scaleY(0);
    }
    to {
      opacity: 1;
      transform: scaleY(1);
    }
  }

  .admin-crown {
    position: absolute;
    top: -2px;
    right: -2px;
    width: 16px;
    height: 16px;
    background: linear-gradient(135deg, #fbbf24, #f59e0b);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 15;
    border: 2px solid var(--rail-bg);
  }

  .separator {
    width: 32px;
    height: 2px;
    background-color: #4F545C;
    border-radius: 1px;
    margin: 8px auto;
  }
`;

export const CommunityRail: React.FC = () => {
  const { joinedCommunities, activeCommunity, setActiveCommunity, loading, error } = useCommunityStore();
  const {
    setActiveCommunity: setUIActiveCommunity,
    openModal,
    setCommandPaletteOpen
  } = useUIStore();
  const { user } = useAuthStore();

  const [hoveredCommunity, setHoveredCommunity] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);

  // Add Discord styles to document head
  React.useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = discordRailStyles;
    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Ensure proper initial state on component mount
  React.useEffect(() => {
    // If no active community is set, ensure we're in Home state
    if (!activeCommunity && !loading) {
      console.log('🏠 [RAIL] Ensuring Home state on mount');
      setUIActiveCommunity(null);
    }
  }, [activeCommunity, loading, setUIActiveCommunity]);

  // Deduplicate communities by ID to prevent React key conflicts
  const uniqueCommunities = React.useMemo(() => {
    if (!Array.isArray(joinedCommunities)) {
      console.warn('⚠️ [RAIL] joinedCommunities is not an array:', joinedCommunities);
      return [];
    }

    const seen = new Set<string>();
    const unique = joinedCommunities.filter(community => {
      if (!community || !community.id) {
        console.warn('⚠️ [RAIL] Invalid community object:', community);
        return false;
      }

      if (seen.has(community.id)) {
        console.warn('⚠️ [RAIL] Duplicate community ID found:', community.id, community.name);
        return false;
      }

      seen.add(community.id);
      return true;
    });

    console.log('🔍 [RAIL] Community deduplication:', {
      original: joinedCommunities.length,
      unique: unique.length,
      duplicatesRemoved: joinedCommunities.length - unique.length
    });

    return unique;
  }, [joinedCommunities]);



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
    if (!user) return false;

    // Use the basic authorization function to check admin role
    const adminStatus = isCommunityAdmin(user, community.id);

    return adminStatus;
  };

  return (
    <div className="discord-rail" role="navigation" aria-label="Community Navigation">
      {/* Home/Dashboard Button */}
      <div className="discord-icon-container">
        {!activeCommunity && (
          <div className="active-indicator" />
        )}
        <button
          onClick={() => {
            console.log('🏠 [RAIL] Home button clicked - clearing all community state');

            // Clear both stores in the correct order and reset section
            setUIActiveCommunity(null);
            setActiveCommunity(null);

            // Force immediate state update to prevent grey space
            setTimeout(() => {
              console.log('✅ [RAIL] Home navigation completed - showing HomeSection');
            }, 10);
          }}
          className={`discord-icon ${!activeCommunity ? 'active' : ''}`}
          title="Home"
          aria-label="Home"
        >
          <Home size={20} />
        </button>
      </div>

      {/* Separator */}
      <div className="separator" />

      {/* Joined Communities */}
      <div className="relative flex-1 min-h-0">
        <div className="communities-container flex flex-col">
        {loading ? (
          // Loading state with Discord styling - show during any loading
          <div className="flex flex-col">
            {[1, 2, 3].map((i) => (
              <div key={`loading-${i}`} className="discord-icon-container">
                <div className="discord-icon animate-pulse" style={{ backgroundColor: '#4F545C' }} />
              </div>
            ))}
          </div>
        ) : error ? (
          // Error state
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="discord-icon" style={{ backgroundColor: '#ED4245', color: 'white' }}>
              !
            </div>
            <p className="text-xs text-gray-400 mt-2 px-2">Failed to load</p>
          </div>
        ) : uniqueCommunities.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="discord-icon" style={{ backgroundColor: '#4F545C', color: '#B9BBBE' }}>
              ?
            </div>
            <p className="text-xs text-gray-400 mt-2 px-2">No communities yet</p>
          </div>
        ) : (
          // Communities list with unique entries
          uniqueCommunities.map((community) => (
            <CommunityAvatar
              key={community.id}
              community={community}
              isActive={activeCommunity?.id === community.id}
              isAdmin={isAdmin(community)}
              onClick={() => handleCommunitySelect(community)}
              onHover={setHoveredCommunity}
            />
          ))
        )}

        {/* Action Buttons - Now inside scrollable container */}
        <div className="flex flex-col mt-4">
          {/* Separator */}
          <div className="separator" />

          {/* Discover Communities */}
          <div className="discord-icon-container">
            <button
              onClick={handleDiscoverCommunities}
              className="discord-icon"
              title="Discover Communities"
              aria-label="Discover Communities"
            >
              <Search size={20} />
            </button>
          </div>

          {/* Create Community */}
          <div className="discord-icon-container">
            <button
              onClick={handleCreateCommunity}
              className="discord-icon"
              title="Create Community"
              aria-label="Create Community"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>
        </div>
      </div>


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
      'mathematics': '#3B82F6',
      'physics': '#8B5CF6',
      'chemistry': '#10B981',
      'biology': '#059669',
      'computer-science': '#6366F1',
      'engineering': '#F97316',
      'literature': '#EC4899',
      'history': '#EAB308',
      'other': '#6B7280'
    };
    return colors[category as keyof typeof colors] || colors.other;
  };

  return (
    <div className="discord-icon-container">
      {/* Active indicator */}
      {isActive && (
        <div className="active-indicator" />
      )}

      {/* Admin crown indicator */}
      {isAdmin && (
        <div className="admin-crown">
          <Crown size={8} color="#1E1F22" />
        </div>
      )}

      <button
        onClick={onClick}
        onMouseEnter={() => onHover(community.name)}
        onMouseLeave={() => onHover(null)}
        className={`discord-icon ${isActive ? 'active' : ''}`}
        style={{
          backgroundColor: isActive ? '#5865F2' : getCommunityColor(community.category),
          color: 'white'
        }}
        title={`${community.name}${isAdmin ? ' (Admin)' : ''}`}
        aria-label={`${community.name}${isAdmin ? ' (Admin)' : ''}`}
      >
        {community.iconUrl ? (
          <img
            src={community.iconUrl}
            alt={community.name}
            className="w-full h-full object-cover rounded-full"
            style={{ borderRadius: 'inherit' }}
          />
        ) : (
          <span className="font-semibold text-sm">{getInitials(community.name)}</span>
        )}
      </button>
    </div>
  );
};
