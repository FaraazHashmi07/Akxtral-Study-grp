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

// ===== SUPER ADMIN SYSTEM =====
export interface SuperAdminState {
  isSuperAdmin: boolean;
  superAdminToken: any | null;
}

export interface SuperAdminAnalytics {
  totalUsers: number;
  totalCommunities: number;
  communitiesCreatedThisWeek: number;
  flaggedCommunities: number;
  storageUsage: number; // in MB
  topActiveCommunities: {
    id: string;
    name: string;
    memberCount: number;
    messageCount: number;
    resourceCount: number;
  }[];
}

export interface SuperAdminCommunityView {
  id: string;
  name: string;
  description: string;
  creatorEmail: string;
  creatorName?: string;
  creatorUid: string;
  createdAt: Date;
  memberCount: number;
  resourceCount: number;
  messageCount: number;
  eventCount: number;
  flagged: boolean;
  lastActivity: Date;
}

export interface SuperAdminUserView {
  uid: string;
  email: string;
  displayName: string;
  communitiesCreated: number;
  communitiesJoined: number;
  registrationDate: Date;
  lastLoginAt: Date;
  flagCount: number;
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
  admins: string[]; // CRITICAL FIX: Add admins array for proper permission tracking
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
  communityId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  type: 'text' | 'resource' | 'system' | 'question';

  // Threading support
  replyTo?: string; // Message ID for threaded replies
  threadCount?: number; // Number of replies to this message
  hasThread?: boolean; // Whether this message has a thread
  threadName?: string; // Optional name for the thread

  // Reply context for Discord-style reply display
  replyToMessageId?: string; // ID of the message being replied to
  replyToSenderName?: string; // Display name of the original sender
  replyToMessageSnippet?: string; // First line/snippet of the original message

  // Pinning support
  isPinned?: boolean;
  pinnedBy?: string;
  pinnedAt?: Date;

  // Q&A support
  isQuestion?: boolean;
  questionAnswers?: QuestionAnswer[];

  // Resource attachment (references existing resource)
  resourceAttachment?: {
    resourceId: string;
    resourceName: string;
    resourceUrl: string;
    resourceType: string;
    uploadedBy: string;
    uploadedByName: string;
  };

  // Reactions
  reactions?: MessageReaction[];

  // Metadata
  editedAt?: Date;
  createdAt: Date;
  mentions: string[]; // User IDs mentioned in message
}

export interface QuestionAnswer {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: Date;
  reactions?: MessageReaction[];
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
  userName: string;
  communityId: string;
  timestamp: Date;
}

// ===== THREADS =====
export interface ThreadMessage {
  id: string;
  parentMessageId: string; // ID of the original message this thread belongs to
  communityId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  type: 'text' | 'resource';

  // Resource attachment (for thread messages)
  resourceAttachment?: {
    resourceId: string;
    resourceName: string;
    resourceUrl: string;
    resourceType: string;
    uploadedBy: string;
    uploadedByName: string;
  };

  // Reactions
  reactions?: MessageReaction[];

  // Metadata
  editedAt?: Date;
  createdAt: Date;
  mentions: string[]; // User IDs mentioned in message
}

export interface Thread {
  id: string; // Same as parent message ID
  parentMessageId: string;
  communityId: string;
  name?: string; // Optional thread name
  createdBy: string;
  createdAt: Date;
  lastActivity: Date;
  messageCount: number;
  participants: string[]; // User IDs who have participated
}

// ===== CHAT STATE =====
export interface ChatState {
  // Messages per community
  messages: Record<string, Message[]>; // communityId -> messages
  pinnedMessages: Record<string, Message[]>; // communityId -> pinned messages

  // Thread state
  threads: Record<string, Thread>; // messageId -> thread info
  threadMessages: Record<string, ThreadMessage[]>; // messageId -> thread messages
  activeThread: string | null; // Currently open thread (messageId)
  threadSidebarOpen: boolean;

  // Real-time state
  typingIndicators: TypingIndicator[];
  loading: boolean;
  error: string | null;

  // Message composition
  messageInput: string;
  replyingTo: Message | null;
  isQuestionMode: boolean;

  // Thread composition
  threadInput: string;
  threadName: string;

  // Pagination
  hasMoreMessages: Record<string, boolean>; // communityId -> hasMore
  lastMessageTimestamp: Record<string, Date>; // communityId -> lastTimestamp
}

// ===== ANNOUNCEMENTS =====
export interface Announcement {
  id: string;
  communityId: string;
  title: string;
  content: string; // Markdown content
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  isPinned: boolean;
  isImportant: boolean;
  attachments?: AnnouncementAttachment[];
  reactions?: MessageReaction[];
  createdAt: Date;
  updatedAt?: Date;
}

export interface AnnouncementAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
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
  uploadedByName?: string; // Optional field for uploader's display name
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
  activeSection: 'dashboard' | 'announcements' | 'chat' | 'resources' | 'calendar';
}

// ===== SUPER ADMIN UI STATE =====
export interface SuperAdminUIState {
  activeAdminSection: 'dashboard' | 'communities' | 'users';
  communitySearchQuery: string;
  userSearchQuery: string;
  selectedCommunityForView: string | null;
  selectedUserForView: string | null;
  showDeleteConfirmation: boolean;
  communityToDelete: string | null;
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