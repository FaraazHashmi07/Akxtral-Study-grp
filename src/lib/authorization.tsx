import React from 'react';
import { User, CommunityRole } from '../types';

// Community-only authorization helper functions

// Check if user has specific community role
export const hasCommunityRole = (
  user: User | null,
  communityId: string,
  roles: CommunityRole['role'][]
): boolean => {
  if (!user) return false;

  const communityRole = user.communityRoles?.[communityId];
  if (!communityRole) return false;

  return roles.includes(communityRole.role);
};

// Check if user is community admin
export const isCommunityAdmin = (user: User | null, communityId: string): boolean => {
  return hasCommunityRole(user, communityId, ['community_admin']);
};

// Check if user is community moderator or higher
export const isCommunityModerator = (user: User | null, communityId: string): boolean => {
  return hasCommunityRole(user, communityId, ['community_admin', 'community_moderator']);
};

// Check if user is community member or higher
export const isCommunityMember = (user: User | null, communityId: string): boolean => {
  return hasCommunityRole(user, communityId, [
    'community_admin',
    'community_moderator',
    'community_member'
  ]);
};

// Check if user can view community content
export const canViewCommunity = (user: User | null, communityId: string): boolean => {
  return hasCommunityRole(user, communityId, [
    'community_admin',
    'community_moderator',
    'community_member',
    'community_viewer'
  ]);
};

// Feature-specific authorization checks (community-scoped only)

// Can manage community settings
export const canManageCommunity = (user: User | null, communityId: string): boolean => {
  return isCommunityAdmin(user, communityId);
};

// Can moderate community (delete messages, approve members, etc.)
export const canModerateCommunity = (user: User | null, communityId: string): boolean => {
  return isCommunityModerator(user, communityId);
};

// Can create content in community
export const canCreateContent = (user: User | null, communityId: string): boolean => {
  return isCommunityMember(user, communityId);
};

// Can upload resources
export const canUploadResources = (user: User | null, communityId: string): boolean => {
  return canCreateContent(user, communityId);
};

// Can create events
export const canCreateEvents = (user: User | null, communityId: string): boolean => {
  return canCreateContent(user, communityId);
};

// Can manage community roles
export const canManageRoles = (user: User | null, communityId: string): boolean => {
  return isCommunityAdmin(user, communityId);
};

// Can approve join requests
export const canApproveJoinRequests = (user: User | null, communityId: string): boolean => {
  return isCommunityModerator(user, communityId);
};

// Can delete messages
export const canDeleteMessages = (user: User | null, communityId: string): boolean => {
  return isCommunityModerator(user, communityId);
};

// Can bulk manage resources
export const canBulkManageResources = (user: User | null, communityId: string): boolean => {
  return isCommunityAdmin(user, communityId);
};

// Can schedule announcements
export const canScheduleAnnouncements = (user: User | null, communityId: string): boolean => {
  return isCommunityAdmin(user, communityId);
};

// Platform-wide permissions (simplified - no global admin)

// Can create communities (any authenticated user)
export const canCreateCommunities = (user: User | null): boolean => {
  return user !== null;
};

// Can archive communities (only community admin for their own community)
export const canArchiveCommunities = (user: User | null, communityId: string): boolean => {
  return isCommunityAdmin(user, communityId);
};

// Authorization middleware for components
export const withAuthorization = <T extends object>(
  Component: React.ComponentType<T>,
  authCheck: (user: User | null) => boolean,
  fallback?: React.ComponentType
) => {
  return (props: T & { user: User | null }) => {
    const { user, ...componentProps } = props;

    if (!authCheck(user)) {
      if (fallback) {
        const FallbackComponent = fallback;
        return <FallbackComponent />;
      }
      return (
        <div className="p-6 text-center">
          <div className="w-16 h-16 text-red-500 mx-auto mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400">
            You don't have permission to access this area.
          </p>
        </div>
      );
    }

    return <Component {...(componentProps as T)} />;
  };
};

// Hook for checking permissions (community-scoped only)
export const usePermissions = (user: User | null) => {
  return {
    // Basic user permissions
    canCreateCommunities: canCreateCommunities(user),

    // Community-specific permission checkers
    canManageCommunity: (communityId: string) => canManageCommunity(user, communityId),
    canModerateCommunity: (communityId: string) => canModerateCommunity(user, communityId),
    canCreateContent: (communityId: string) => canCreateContent(user, communityId),
    canManageRoles: (communityId: string) => canManageRoles(user, communityId),
    canApproveJoinRequests: (communityId: string) => canApproveJoinRequests(user, communityId),
    canDeleteMessages: (communityId: string) => canDeleteMessages(user, communityId),
    canViewCommunity: (communityId: string) => canViewCommunity(user, communityId),
    canArchiveCommunities: (communityId: string) => canArchiveCommunities(user, communityId),

    // Role checkers
    isCommunityAdmin: (communityId: string) => isCommunityAdmin(user, communityId),
    isCommunityModerator: (communityId: string) => isCommunityModerator(user, communityId),
    isCommunityMember: (communityId: string) => isCommunityMember(user, communityId)
  };
};
import { User, CommunityRole } from '../types';
import { getCommunityRole } from './userProfile';

// Authorization helper functions

// Check if user has global role
export const hasGlobalRole = (user: User | null, role: 'super_admin' | 'user'): boolean => {
  if (!user) return false;
  return user.globalRole === role;
};

// Check if user is super admin
export const isSuperAdmin = (user: User | null): boolean => {
  return hasGlobalRole(user, 'super_admin');
};

// Check if user has specific community role
export const hasCommunityRole = (
  user: User | null,
  communityId: string,
  roles: CommunityRole['role'][]
): boolean => {
  if (!user) return false;
  
  // Super admins have access to everything
  if (isSuperAdmin(user)) return true;
  
  const communityRole = user.communityRoles?.[communityId];
  if (!communityRole) return false;
  
  return roles.includes(communityRole.role);
};

// Check if user is community admin
export const isCommunityAdmin = (user: User | null, communityId: string): boolean => {
  return hasCommunityRole(user, communityId, ['community_admin']);
};

// Check if user is community moderator or higher
export const isCommunityModerator = (user: User | null, communityId: string): boolean => {
  return hasCommunityRole(user, communityId, ['community_admin', 'community_moderator']);
};

// Check if user is community member or higher
export const isCommunityMember = (user: User | null, communityId: string): boolean => {
  return hasCommunityRole(user, communityId, [
    'community_admin',
    'community_moderator',
    'community_member'
  ]);
};

// Check if user can view community content
export const canViewCommunity = (user: User | null, communityId: string): boolean => {
  return hasCommunityRole(user, communityId, [
    'community_admin',
    'community_moderator',
    'community_member',
    'community_viewer'
  ]);
};

// Feature-specific authorization checks

// Can manage community settings
export const canManageCommunity = (user: User | null, communityId: string): boolean => {
  return isSuperAdmin(user) || isCommunityAdmin(user, communityId);
};

// Can moderate community (delete messages, approve members, etc.)
export const canModerateCommunity = (user: User | null, communityId: string): boolean => {
  return isSuperAdmin(user) || isCommunityModerator(user, communityId);
};

// Can create content in community
export const canCreateContent = (user: User | null, communityId: string): boolean => {
  return isSuperAdmin(user) || isCommunityMember(user, communityId);
};

// Can upload resources
export const canUploadResources = (user: User | null, communityId: string): boolean => {
  return canCreateContent(user, communityId);
};

// Can create events
export const canCreateEvents = (user: User | null, communityId: string): boolean => {
  return canCreateContent(user, communityId);
};

// Can manage community roles
export const canManageRoles = (user: User | null, communityId: string): boolean => {
  return isSuperAdmin(user) || isCommunityAdmin(user, communityId);
};

// Can approve join requests
export const canApproveJoinRequests = (user: User | null, communityId: string): boolean => {
  return isSuperAdmin(user) || isCommunityModerator(user, communityId);
};

// Can delete messages
export const canDeleteMessages = (user: User | null, communityId: string): boolean => {
  return isSuperAdmin(user) || isCommunityModerator(user, communityId);
};

// Can bulk manage resources
export const canBulkManageResources = (user: User | null, communityId: string): boolean => {
  return isSuperAdmin(user) || isCommunityAdmin(user, communityId);
};

// Can schedule announcements
export const canScheduleAnnouncements = (user: User | null, communityId: string): boolean => {
  return isSuperAdmin(user) || isCommunityAdmin(user, communityId);
};

// Platform-wide permissions

// Can view platform analytics
export const canViewPlatformAnalytics = (user: User | null): boolean => {
  return isSuperAdmin(user);
};

// Can manage all users
export const canManageAllUsers = (user: User | null): boolean => {
  return isSuperAdmin(user);
};

// Can access database management
export const canAccessDatabaseManagement = (user: User | null): boolean => {
  return isSuperAdmin(user);
};

// Can create communities
export const canCreateCommunities = (user: User | null): boolean => {
  // Any authenticated user can create communities
  return user !== null;
};

// Can archive communities
export const canArchiveCommunities = (user: User | null, communityId?: string): boolean => {
  if (isSuperAdmin(user)) return true;
  if (communityId) return isCommunityAdmin(user, communityId);
  return false;
};

// Authorization middleware for components
export const withAuthorization = <T extends object>(
  Component: React.ComponentType<T>,
  authCheck: (user: User | null) => boolean,
  fallback?: React.ComponentType
) => {
  return (props: T & { user: User | null }) => {
    const { user, ...componentProps } = props;
    
    if (!authCheck(user)) {
      if (fallback) {
        const FallbackComponent = fallback;
        return <FallbackComponent />;
      }
      return (
        <div className="p-6 text-center">
          <div className="w-16 h-16 text-red-500 mx-auto mb-4">🚫</div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h2>
          <p className="text-gray-600 dark:text-gray-400">
            You don't have permission to access this area.
          </p>
        </div>
      );
    }
    
    return <Component {...(componentProps as T)} />;
  };
};

// Hook for checking permissions
export const usePermissions = (user: User | null) => {
  return {
    // Global permissions
    isSuperAdmin: isSuperAdmin(user),
    canViewPlatformAnalytics: canViewPlatformAnalytics(user),
    canManageAllUsers: canManageAllUsers(user),
    canAccessDatabaseManagement: canAccessDatabaseManagement(user),
    canCreateCommunities: canCreateCommunities(user),
    
    // Community-specific permission checkers
    canManageCommunity: (communityId: string) => canManageCommunity(user, communityId),
    canModerateCommunity: (communityId: string) => canModerateCommunity(user, communityId),
    canCreateContent: (communityId: string) => canCreateContent(user, communityId),
    canManageRoles: (communityId: string) => canManageRoles(user, communityId),
    canApproveJoinRequests: (communityId: string) => canApproveJoinRequests(user, communityId),
    canDeleteMessages: (communityId: string) => canDeleteMessages(user, communityId),
    canViewCommunity: (communityId: string) => canViewCommunity(user, communityId),
    
    // Role checkers
    isCommunityAdmin: (communityId: string) => isCommunityAdmin(user, communityId),
    isCommunityModerator: (communityId: string) => isCommunityModerator(user, communityId),
    isCommunityMember: (communityId: string) => isCommunityMember(user, communityId)
  };
};
