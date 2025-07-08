import { create } from 'zustand';
import {
  UserNotification,
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  subscribeToUserNotifications
} from '../services/notificationService';
import { useUIStore } from './uiStore';

interface NotificationState {
  notifications: UserNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  
  // Actions
  loadNotifications: (userId: string) => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: (userId: string) => Promise<void>;
  subscribeToNotifications: (userId: string) => void;
  unsubscribeFromNotifications: () => void;
  clearNotifications: () => void;
}

let unsubscribeFunction: (() => void) | null = null;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,

  loadNotifications: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      console.log('📬 [STORE] Loading notifications for user:', userId);
      const notifications = await getUserNotifications(userId);
      const unreadCount = notifications.filter(n => !n.read).length;
      
      set({ 
        notifications, 
        unreadCount,
        loading: false 
      });
      
      console.log('✅ [STORE] Loaded notifications:', notifications.length, 'unread:', unreadCount);
    } catch (error) {
      console.error('❌ [STORE] Failed to load notifications:', error);
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load notifications',
        loading: false 
      });
    }
  },

  markAsRead: async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      
      // Update local state
      set(state => ({
        notifications: state.notifications.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1)
      }));
      
      console.log('✅ [STORE] Marked notification as read:', notificationId);
    } catch (error) {
      console.error('❌ [STORE] Failed to mark notification as read:', error);
    }
  },

  markAllAsRead: async (userId: string) => {
    try {
      await markAllNotificationsAsRead(userId);
      
      // Update local state
      set(state => ({
        notifications: state.notifications.map(n => ({ ...n, read: true })),
        unreadCount: 0
      }));
      
      console.log('✅ [STORE] Marked all notifications as read');
    } catch (error) {
      console.error('❌ [STORE] Failed to mark all notifications as read:', error);
    }
  },

  subscribeToNotifications: (userId: string) => {
    // Unsubscribe from any existing subscription
    if (unsubscribeFunction) {
      unsubscribeFunction();
    }
    
    console.log('🔔 [STORE] Subscribing to real-time notifications for user:', userId);
    
    unsubscribeFunction = subscribeToUserNotifications(userId, (notifications) => {
      const unreadCount = notifications.filter(n => !n.read).length;
      
      set({ 
        notifications, 
        unreadCount,
        loading: false,
        error: null
      });
      
      console.log('🔔 [STORE] Real-time notification update:', notifications.length, 'unread:', unreadCount);
      
      // Show toast for new unread notifications
      const state = get();
      const newNotifications = notifications.filter(n => 
        !n.read && 
        !state.notifications.some(existing => existing.id === n.id)
      );
      
      if (newNotifications.length > 0) {
        // Use toast system with static import
        const { showToast } = useUIStore.getState();
        newNotifications.forEach(notification => {
          showToast({
            type: notification.type === 'join_request_approved' ? 'success' : 'info',
            title: notification.title,
            message: notification.message
          });
        });
      }
    });
  },

  unsubscribeFromNotifications: () => {
    if (unsubscribeFunction) {
      console.log('🔕 [STORE] Unsubscribing from notifications');
      unsubscribeFunction();
      unsubscribeFunction = null;
    }
  },

  clearNotifications: () => {
    set({
      notifications: [],
      unreadCount: 0,
      loading: false,
      error: null
    });
    
    if (unsubscribeFunction) {
      unsubscribeFunction();
      unsubscribeFunction = null;
    }
  }
}));
