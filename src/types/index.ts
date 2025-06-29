export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'admin' | 'member';
  isOnline: boolean;
  lastSeen: Date;
  badges: string[];
  joinedCommunities: string[];
}

export interface Community {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: 'mathematics' | 'physics' | 'chemistry' | 'biology' | 'computer-science' | 'engineering' | 'literature' | 'history';
  memberCount: number;
  activeMembers: number;
  subCommunities: SubCommunity[];
  isJoined: boolean;
  createdAt: Date;
  lastActivity: Date;
  moderators: string[];
}

export interface Group {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  memberCount: number;
  unreadCount: number;
  tags: string[];
  isJoined: boolean;
}

export interface SubCommunity {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  parentCommunityId: string;
  memberCount: number;
  isJoined: boolean;
  discussionCount: number;
  resourceCount: number;
  eventCount: number;
  createdAt: Date;
  lastActivity: Date;
}

export interface Message {
  id: string;
  content: string;
  author: User;
  timestamp: Date;
  threadId?: string;
  reactions: { emoji: string; count: number; users: string[] }[];
  isAnnouncement?: boolean;
  attachments?: Attachment[];
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
  thumbnail?: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  meetingLink?: string;
  attendees: User[];
  rsvpStatus: 'going' | 'maybe' | 'not-going' | 'pending';
  color: string;
  communityId?: string;
}

export interface DatabaseRecord {
  id: string;
  title: string;
  fields: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: User;
  communityId?: string;
}

export interface Notification {
  id: string;
  type: 'message' | 'event' | 'resource' | 'announcement' | 'community';
  title: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
  actionUrl?: string;
}

export interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  totalCommunities: number;
  totalMessages: number;
  totalResources: number;
  userGrowth: { date: string; users: number }[];
  communityActivity: { community: string; messages: number; resources: number }[];
  userActivity: { date: string; active: number; new: number }[];
}