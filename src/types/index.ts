// ===== USER & AUTHENTICATION =====
export interface User {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  bio?: string;
  preferences: {
    darkMode: boolean;
    locale: string;
    notifications: {
      email: boolean;
      push: boolean;
      mentions: boolean;
    };
  };
  providerIds: string[];
  emailVerified: boolean;
  createdAt: Date;
  lastLoginAt: Date;
  // Global role - all users are just 'user', no platform-wide admin privileges
  globalRole: 'user';
  // Community roles (stored in Firestore per community)
  communityRoles?: Record<string, CommunityRole>;
}

export interface CommunityRole {
  role: 'community_admin' | 'community_member';
  assignedAt: Date;
  assignedBy: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

// ===== COMMUNITY SYSTEM =====
export interface Community {
  id: string;
  name: string;
  description: string;
  bannerUrl?: string;
  iconUrl?: string;
  tags: string[];
  category: 'mathematics' | 'physics' | 'chemistry' | 'biology' | 'computer-science' | 'engineering' | 'literature' | 'history' | 'other';
  visibility: 'public' | 'private';
  requiresApproval: boolean;
  memberCount: number;
  createdBy: string;
  createdAt: Date;
  lastActivity: Date;
  settings: CommunitySettings;
}

export interface CommunitySettings {
  allowMemberInvites: boolean;
  allowFileUploads: boolean;
  maxFileSize: number; // in MB
  allowedFileTypes: string[];
}

export interface CommunityMember {
  uid: string;
  communityId: string;
  role: 'community_admin' | 'community_member';
  joinedAt: Date;
  invitedBy?: string;
  lastActive: Date;
}

export interface JoinRequest {
  id: string;
  communityId: string;
  userId: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  reviewedAt?: Date;
  reviewedBy?: string;
}

// ===== CHAT SYSTEM =====
export interface ChatChannel {
  id: string;
  communityId: string;
  name: string;
  description?: string;
  type: 'text' | 'voice' | 'announcement';
  position: number;
  createdBy: string;
  createdAt: Date;
  lastMessageAt?: Date;
  permissions: ChannelPermissions;
}

export interface ChannelPermissions {
  viewChannel: ('community_admin' | 'community_member')[];
  sendMessages: ('community_admin' | 'community_member')[];
  manageMessages: ('community_admin')[];
}

export interface Message {
  id: string;
  channelId: string;
  communityId: string;
  authorId: string;
  content: string;
  type: 'text' | 'file' | 'image' | 'system';
  attachments?: MessageAttachment[];
  reactions?: MessageReaction[];
  replyTo?: string; // Message ID for threaded replies
  editedAt?: Date;
  createdAt: Date;
  mentions: string[]; // User IDs mentioned in message
}

export interface MessageAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface MessageReaction {
  emoji: string;
  users: string[]; // User IDs who reacted
  count: number;
}

export interface TypingIndicator {
  userId: string;
  channelId: string;
  timestamp: Date;
}

// ===== ANNOUNCEMENTS =====
export interface Announcement {
  id: string;
  communityId: string;
  title: string;
  content: string; // Markdown content
  authorId: string;
  isPinned: boolean;
  isImportant: boolean;
  reactions?: MessageReaction[];
  createdAt: Date;
  updatedAt?: Date;
}

// ===== RESOURCES =====
export interface Resource {
  id: string;
  communityId: string;
  name: string;
  description?: string;
  type: 'file' | 'link' | 'video';
  url: string;
  thumbnailUrl?: string;
  fileSize?: number;
  mimeType?: string;
  tags: string[];
  uploadedBy: string;
  uploadedAt: Date;
  downloads: number;
  likes: string[]; // User IDs who liked
}

export interface ResourceTag {
  id: string;
  name: string;
  color: string;
  communityId: string;
  createdBy: string;
  createdAt: Date;
}

// ===== EVENTS & CALENDAR =====
export interface Event {
  id: string;
  communityId: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  meetingLink?: string;
  type: 'study_session' | 'meeting' | 'exam' | 'deadline' | 'social';
  createdBy: string;
  createdAt: Date;
  rsvps: EventRSVP[];
  maxAttendees?: number;
  isRecurring: boolean;
  recurrenceRule?: string;
}

export interface EventRSVP {
  userId: string;
  status: 'yes' | 'no' | 'maybe';
  respondedAt: Date;
  note?: string;
}

// ===== NOTIFICATIONS =====
export interface Notification {
  id: string;
  userId: string;
  type: 'message' | 'event' | 'resource' | 'announcement' | 'community' | 'join_request';
  title: string;
  content: string;
  communityId?: string;
  relatedId?: string; // ID of the related entity (message, event, etc.)
  timestamp: Date;
  isRead: boolean;
  actionUrl?: string;
}

// ===== UI STATE =====
export interface UIState {
  theme: 'light' | 'dark' | 'system';
  sidebarCollapsed: boolean;
  activeModal: string | null;
  commandPaletteOpen: boolean;
  notificationPanelOpen: boolean;
  activeCommunityId: string | null;
  activeChannelId: string | null;
  activeSection: 'dashboard' | 'announcements' | 'chat' | 'resources' | 'calendar' | 'meets';
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// ===== SEARCH & DISCOVERY =====
export interface SearchResult {
  type: 'community' | 'message' | 'resource' | 'event' | 'user';
  id: string;
  title: string;
  description: string;
  communityId?: string;
  relevanceScore: number;
  highlightedText?: string;
}

export interface CommunityFilter {
  category?: string;
  tags?: string[];
  visibility?: 'public' | 'private';
  memberCount?: { min?: number; max?: number };
  sortBy?: 'name' | 'memberCount' | 'activity' | 'created';
  sortOrder?: 'asc' | 'desc';
}

// ===== ANALYTICS & DASHBOARD =====
export interface CommunityAnalytics {
  communityId: string;
  memberCount: number;
  activeMembers: number;
  messageCount: number;
  resourceCount: number;
  eventCount: number;
  joinRequestCount: number;
  activityTrend: { date: string; messages: number; activeUsers: number }[];
  topContributors: { userId: string; messageCount: number; resourceCount: number }[];
}