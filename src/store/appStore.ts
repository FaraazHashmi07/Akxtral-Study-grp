import { create } from 'zustand';
import { Community, Group, SubCommunity, Message, Event, Notification, AnalyticsData } from '../types';

interface AppState {
  currentView: string;
  isDarkMode: boolean;
  showCommandPalette: boolean;
  showNotifications: boolean;
  showSignOutConfirm: boolean;
  notifications: Notification[];
  groups: Group[];
  communities: Community[];
  subCommunities: SubCommunity[];
  messages: Message[];
  events: Event[];
  analyticsData: AnalyticsData;
  setCurrentView: (view: string) => void;
  toggleDarkMode: () => void;
  toggleCommandPalette: () => void;
  toggleNotifications: () => void;
  toggleSignOutConfirm: () => void;
  markNotificationRead: (id: string) => void;
  joinCommunity: (communityId: string) => void;
  leaveCommunity: (communityId: string) => void;
  joinSubCommunity: (subCommunityId: string) => void;
  leaveSubCommunity: (subCommunityId: string) => void;
}

const mockCommunities: Community[] = [
  {
    id: '1',
    name: 'Mathematics',
    description: 'Explore the world of numbers, equations, and mathematical concepts',
    icon: '📐',
    color: 'bg-blue-500',
    category: 'mathematics',
    memberCount: 1247,
    activeMembers: 89,
    isJoined: true,
    createdAt: new Date('2023-01-15'),
    lastActivity: new Date(),
    moderators: ['admin1', 'admin2'],
    subCommunities: [
      {
        id: 'sub1',
        name: 'Calculus',
        description: 'Differential and integral calculus discussions',
        icon: '∫',
        color: 'bg-blue-400',
        parentCommunityId: '1',
        memberCount: 456,
        isJoined: true,
        discussionCount: 234,
        resourceCount: 89,
        eventCount: 12,
        createdAt: new Date('2023-02-01'),
        lastActivity: new Date()
      },
      {
        id: 'sub2',
        name: 'Linear Algebra',
        description: 'Vectors, matrices, and linear transformations',
        icon: '⟨⟩',
        color: 'bg-blue-300',
        parentCommunityId: '1',
        memberCount: 321,
        isJoined: false,
        discussionCount: 156,
        resourceCount: 67,
        eventCount: 8,
        createdAt: new Date('2023-02-15'),
        lastActivity: new Date()
      }
    ]
  },
  {
    id: '2',
    name: 'Physics',
    description: 'Understanding the fundamental laws of the universe',
    icon: '⚛️',
    color: 'bg-purple-500',
    category: 'physics',
    memberCount: 892,
    activeMembers: 67,
    isJoined: true,
    createdAt: new Date('2023-01-20'),
    lastActivity: new Date(),
    moderators: ['admin1'],
    subCommunities: [
      {
        id: 'sub3',
        name: 'Quantum Physics',
        description: 'Explore the quantum realm and its mysteries',
        icon: '🌌',
        color: 'bg-purple-400',
        parentCommunityId: '2',
        memberCount: 234,
        isJoined: true,
        discussionCount: 178,
        resourceCount: 45,
        eventCount: 6,
        createdAt: new Date('2023-03-01'),
        lastActivity: new Date()
      }
    ]
  },
  {
    id: '3',
    name: 'Computer Science',
    description: 'Programming, algorithms, and computational thinking',
    icon: '💻',
    color: 'bg-green-500',
    category: 'computer-science',
    memberCount: 1567,
    activeMembers: 123,
    isJoined: false,
    createdAt: new Date('2023-01-10'),
    lastActivity: new Date(),
    moderators: ['admin2', 'admin3'],
    subCommunities: [
      {
        id: 'sub4',
        name: 'Data Structures',
        description: 'Arrays, trees, graphs, and more',
        icon: '🌳',
        color: 'bg-green-400',
        parentCommunityId: '3',
        memberCount: 567,
        isJoined: false,
        discussionCount: 345,
        resourceCount: 123,
        eventCount: 15,
        createdAt: new Date('2023-02-10'),
        lastActivity: new Date()
      },
      {
        id: 'sub5',
        name: 'Machine Learning',
        description: 'AI, neural networks, and data science',
        icon: '🤖',
        color: 'bg-green-300',
        parentCommunityId: '3',
        memberCount: 789,
        isJoined: false,
        discussionCount: 456,
        resourceCount: 234,
        eventCount: 20,
        createdAt: new Date('2023-02-20'),
        lastActivity: new Date()
      }
    ]
  }
];

const mockAnalyticsData: AnalyticsData = {
  totalUsers: 5432,
  activeUsers: 1234,
  totalCommunities: 12,
  totalMessages: 45678,
  totalResources: 2345,
  userGrowth: [
    { date: '2024-01', users: 1000 },
    { date: '2024-02', users: 1500 },
    { date: '2024-03', users: 2200 },
    { date: '2024-04', users: 3100 },
    { date: '2024-05', users: 4200 },
    { date: '2024-06', users: 5432 }
  ],
  communityActivity: [
    { community: 'Mathematics', messages: 1234, resources: 234 },
    { community: 'Physics', messages: 987, resources: 156 },
    { community: 'Computer Science', messages: 2345, resources: 567 },
    { community: 'Chemistry', messages: 678, resources: 123 }
  ],
  userActivity: [
    { date: '2024-06-01', active: 234, new: 12 },
    { date: '2024-06-02', active: 267, new: 15 },
    { date: '2024-06-03', active: 298, new: 18 },
    { date: '2024-06-04', active: 312, new: 22 },
    { date: '2024-06-05', active: 345, new: 25 },
    { date: '2024-06-06', active: 378, new: 28 },
    { date: '2024-06-07', active: 401, new: 31 }
  ]
};

export const useAppStore = create<AppState>((set, get) => ({
  currentView: 'dashboard',
  showCommandPalette: false,
  showNotifications: false,
  showSignOutConfirm: false,
  notifications: [
    {
      id: '1',
      type: 'message',
      title: 'New message in Study Group',
      content: 'Sarah posted a new question about React hooks',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      isRead: false
    },
    {
      id: '2',
      type: 'community',
      title: 'New member joined Mathematics',
      content: 'John Doe joined the Calculus sub-community',
      timestamp: new Date(Date.now() - 10 * 60 * 1000),
      isRead: false
    }
  ],
  groups: [
    {
      id: '1',
      name: 'React Study Group',
      description: 'Learning React together',
      icon: '⚛️',
      color: 'bg-blue-500',
      memberCount: 24,
      unreadCount: 3,
      tags: ['React', 'JavaScript', 'Frontend'],
      isJoined: true
    },
    {
      id: '2',
      name: 'Data Structures',
      description: 'Algorithms and data structures practice',
      icon: '🌳',
      color: 'bg-green-500',
      memberCount: 18,
      unreadCount: 0,
      tags: ['Algorithms', 'Computer Science'],
      isJoined: true
    }
  ],
  communities: mockCommunities,
  subCommunities: [],
  messages: [],
  events: [],
  analyticsData: mockAnalyticsData,
  setCurrentView: (view) => set({ currentView: view }),
  toggleCommandPalette: () => set((state) => ({ showCommandPalette: !state.showCommandPalette })),
  toggleNotifications: () => set((state) => ({ showNotifications: !state.showNotifications })),
  toggleSignOutConfirm: () => set((state) => ({ showSignOutConfirm: !state.showSignOutConfirm })),
  markNotificationRead: (id) => set((state) => ({
    notifications: state.notifications.map(n => 
      n.id === id ? { ...n, isRead: true } : n
    )
  })),
  joinCommunity: (communityId) => set((state) => ({
    communities: state.communities.map(c =>
      c.id === communityId ? { ...c, isJoined: true, memberCount: c.memberCount + 1 } : c
    )
  })),
  leaveCommunity: (communityId) => set((state) => ({
    communities: state.communities.map(c =>
      c.id === communityId ? { ...c, isJoined: false, memberCount: c.memberCount - 1 } : c
    )
  })),
  joinSubCommunity: (subCommunityId) => set((state) => ({
    communities: state.communities.map(c => ({
      ...c,
      subCommunities: c.subCommunities.map(sc =>
        sc.id === subCommunityId ? { ...sc, isJoined: true, memberCount: sc.memberCount + 1 } : sc
      )
    }))
  })),
  leaveSubCommunity: (subCommunityId) => set((state) => ({
    communities: state.communities.map(c => ({
      ...c,
      subCommunities: c.subCommunities.map(sc =>
        sc.id === subCommunityId ? { ...sc, isJoined: false, memberCount: sc.memberCount - 1 } : sc
      )
    }))
  }))
}));