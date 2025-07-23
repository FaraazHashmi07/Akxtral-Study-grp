import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UIState, Toast, Notification } from '../types';

interface UIStore extends UIState {
  // Toast notifications
  toasts: Toast[];
  
  // Notifications
  notifications: Notification[];
  unreadNotificationCount: number;
  
  // Modal management
  modals: Record<string, any>;
  
  // Actions
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  
  // Modal management
  openModal: (modalId: string, data?: any) => void;
  closeModal: (modalId?: string) => void;
  
  // Command palette
  toggleCommandPalette: () => void;
  setCommandPaletteOpen: (open: boolean) => void;
  
  // Notifications
  toggleNotificationPanel: () => void;
  setNotificationPanelOpen: (open: boolean) => void;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
  removeNotification: (notificationId: string) => void;
  clearAllNotifications: () => void;
  
  // Navigation
  setActiveCommunity: (communityId: string | null) => void;
  setActiveChannel: (channelId: string | null) => void;
  setActiveSection: (section: UIState['activeSection']) => void;
  
  // Toast management
  showToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (toastId: string) => void;
  clearAllToasts: () => void;
  
  // Keyboard shortcuts
  handleKeyboardShortcut: (key: string, modifiers: string[]) => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      // Initial state
      theme: 'system',
      sidebarCollapsed: false,
      activeModal: null,
      commandPaletteOpen: false,
      notificationPanelOpen: false,
      activeCommunityId: null,
      activeChannelId: null,
      activeSection: 'announcements',
      
      // Non-persisted state
      toasts: [],
      notifications: [],
      unreadNotificationCount: 0,
      modals: {},

      // Theme management
      setTheme: (theme) => {
        set({ theme });
        
        // Apply theme to document
        const root = document.documentElement;
        if (theme === 'dark') {
          root.classList.add('dark');
        } else if (theme === 'light') {
          root.classList.remove('dark');
        } else {
          // System theme
          const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          if (prefersDark) {
            root.classList.add('dark');
          } else {
            root.classList.remove('dark');
          }
        }
      },

      // Sidebar management
      toggleSidebar: () => {
        const { sidebarCollapsed } = get();
        console.log('🔄 [UI] Toggling sidebar:', !sidebarCollapsed);
        set({ sidebarCollapsed: !sidebarCollapsed });
      },

      setSidebarCollapsed: (collapsed) => {
        console.log('🔄 [UI] Setting sidebar collapsed:', collapsed);
        set({ sidebarCollapsed: collapsed });
      },

      // Modal management
      openModal: (modalId, data) => {
        const { modals } = get();
        console.log('🔄 [UI] Opening modal:', modalId);
        set({
          activeModal: modalId,
          modals: { ...modals, [modalId]: data || {} }
        });
      },

      closeModal: (modalId) => {
        const { activeModal, modals } = get();
        console.log('🔄 [UI] Closing modal:', modalId || 'current');
        if (modalId) {
          const { [modalId]: removed, ...remainingModals } = modals;
          set({
            modals: remainingModals,
            activeModal: activeModal === modalId ? null : activeModal
          });
        } else {
          set({ activeModal: null });
        }
      },

      // Command palette
      toggleCommandPalette: () => {
        const { commandPaletteOpen } = get();
        set({ commandPaletteOpen: !commandPaletteOpen });
      },

      setCommandPaletteOpen: (open) => {
        set({ commandPaletteOpen: open });
      },

      // Notification panel
      toggleNotificationPanel: () => {
        const { notificationPanelOpen } = get();
        set({ notificationPanelOpen: !notificationPanelOpen });
      },

      setNotificationPanelOpen: (open) => {
        set({ notificationPanelOpen: open });
      },

      // Notification management
      addNotification: (notification) => {
        const { notifications } = get();
        const newNotification = {
          ...notification,
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        
        const updatedNotifications = [newNotification, ...notifications];
        const unreadCount = updatedNotifications.filter(n => !n.isRead).length;
        
        set({ 
          notifications: updatedNotifications,
          unreadNotificationCount: unreadCount
        });
      },

      markNotificationRead: (notificationId) => {
        const { notifications } = get();
        const updatedNotifications = notifications.map(n => 
          n.id === notificationId ? { ...n, isRead: true } : n
        );
        const unreadCount = updatedNotifications.filter(n => !n.isRead).length;
        
        set({ 
          notifications: updatedNotifications,
          unreadNotificationCount: unreadCount
        });
      },

      markAllNotificationsRead: () => {
        const { notifications } = get();
        const updatedNotifications = notifications.map(n => ({ ...n, isRead: true }));
        
        set({ 
          notifications: updatedNotifications,
          unreadNotificationCount: 0
        });
      },

      removeNotification: (notificationId) => {
        const { notifications } = get();
        const updatedNotifications = notifications.filter(n => n.id !== notificationId);
        const unreadCount = updatedNotifications.filter(n => !n.isRead).length;
        
        set({ 
          notifications: updatedNotifications,
          unreadNotificationCount: unreadCount
        });
      },

      clearAllNotifications: () => {
        set({ 
          notifications: [],
          unreadNotificationCount: 0
        });
      },

      // Navigation
      setActiveCommunity: (communityId) => {
        set({ 
          activeCommunityId: communityId,
          activeChannelId: null, // Reset channel when switching communities
          activeSection: 'announcements' // Reset to announcements when switching communities
        });
      },

      setActiveChannel: (channelId) => {
        set({ 
          activeChannelId: channelId,
          activeSection: 'chat' // Switch to chat section when selecting a channel
        });
      },

      setActiveSection: (section) => {
        set({ activeSection: section });
      },

      // Toast management
      showToast: (toast) => {
        const { toasts } = get();
        const newToast = {
          ...toast,
          id: `toast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };
        
        set({ toasts: [...toasts, newToast] });
        
        // Auto-remove toast after duration (default 5 seconds)
        const duration = toast.duration || 5000;
        if (duration > 0) {
          setTimeout(() => {
            get().removeToast(newToast.id);
          }, duration);
        }
      },

      removeToast: (toastId) => {
        const { toasts } = get();
        set({ toasts: toasts.filter(t => t.id !== toastId) });
      },

      clearAllToasts: () => {
        set({ toasts: [] });
      },

      // Keyboard shortcuts
      handleKeyboardShortcut: (key, modifiers) => {
        const { commandPaletteOpen, notificationPanelOpen } = get();
        
        // Cmd/Ctrl + K - Toggle command palette
        if (key === 'k' && (modifiers.includes('cmd') || modifiers.includes('ctrl'))) {
          get().toggleCommandPalette();
          return;
        }
        
        // Escape - Close modals/panels
        if (key === 'Escape') {
          if (commandPaletteOpen) {
            get().setCommandPaletteOpen(false);
          } else if (notificationPanelOpen) {
            get().setNotificationPanelOpen(false);
          } else {
            get().closeModal();
          }
          return;
        }
        
        // Cmd/Ctrl + Shift + N - Toggle notifications
        if (key === 'n' && (modifiers.includes('cmd') || modifiers.includes('ctrl')) && modifiers.includes('shift')) {
          get().toggleNotificationPanel();
          return;
        }
        
        // Cmd/Ctrl + B - Toggle sidebar
        if (key === 'b' && (modifiers.includes('cmd') || modifiers.includes('ctrl'))) {
          get().toggleSidebar();
          return;
        }
        
        // Number keys 1-9 - Quick navigation to sections
        const sectionMap: Record<string, UIState['activeSection']> = {
          '1': 'dashboard',
          '2': 'announcements',
          '3': 'chat',
          '4': 'resources',
          '5': 'calendar'
        };
        
        if (sectionMap[key] && (modifiers.includes('cmd') || modifiers.includes('ctrl'))) {
          get().setActiveSection(sectionMap[key]);
          return;
        }
      }
    }),
    {
      name: 'ui-store',
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        activeCommunityId: state.activeCommunityId,
        activeChannelId: state.activeChannelId,
        activeSection: state.activeSection
      })
    }
  )
);

// Initialize theme on store creation
if (typeof window !== 'undefined') {
  const store = useUIStore.getState();
  store.setTheme(store.theme);
  
  // Listen for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', () => {
    const currentTheme = useUIStore.getState().theme;
    if (currentTheme === 'system') {
      store.setTheme('system');
    }
  });
  
  // Global keyboard shortcut listener
  document.addEventListener('keydown', (event) => {
    const modifiers = [];
    if (event.ctrlKey) modifiers.push('ctrl');
    if (event.metaKey) modifiers.push('cmd');
    if (event.shiftKey) modifiers.push('shift');
    if (event.altKey) modifiers.push('alt');
    
    // Prevent default for our shortcuts
    const shortcutKeys = ['k', 'n', 'b', '1', '2', '3', '4', '5', '6'];
    if (shortcutKeys.includes(event.key.toLowerCase()) && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
    }
    
    if (event.key === 'Escape') {
      event.preventDefault();
    }
    
    store.handleKeyboardShortcut(event.key, modifiers);
  });
}
