import { create } from 'zustand';
import { Event } from '../types';
import { 
  createEvent as createEventService,
  updateEvent as updateEventService,
  deleteEvent as deleteEventService,
  getCommunityEvents,
  subscribeToEvents,
  getEventsForDate
} from '../services/eventService';
import { useAuthStore } from './authStore';

interface EventState {
  // State
  events: Record<string, Event[]>; // communityId -> events
  loading: boolean;
  error: string | null;
  
  // Calendar view state
  selectedDate: Date;
  
  // Real-time subscriptions
  unsubscribers: Record<string, () => void>; // communityId -> unsubscribe function
  
  // Actions
  loadEvents: (communityId: string, startDate?: Date, endDate?: Date) => Promise<void>;
  subscribeToEvents: (communityId: string, startDate?: Date, endDate?: Date) => void;
  unsubscribeFromEvents: (communityId: string) => void;
  createEvent: (communityId: string, eventData: Omit<Event, 'id' | 'createdAt' | 'createdBy' | 'createdByName'>) => Promise<Event>;
  updateEvent: (communityId: string, eventId: string, updates: Partial<Event>) => Promise<void>;
  deleteEvent: (communityId: string, eventId: string) => Promise<void>;
  
  // Calendar navigation
  setSelectedDate: (date: Date) => void;
  navigateCalendar: (direction: 'prev' | 'next') => void;
  goToToday: () => void;
  
  // Utility functions
  getEventsForDateLocal: (date: Date, communityId: string) => Event[];
  getUpcomingEvents: (communityId: string, limit?: number) => Event[];
}

export const useEventStore = create<EventState>((set, get) => ({
  // Initial state
  events: {},
  loading: false,
  error: null,
  selectedDate: new Date(),
  unsubscribers: {},

  // Load events for a community within a date range
  loadEvents: async (communityId, startDate, endDate) => {
    set({ loading: true, error: null });
    
    try {
      const events = await getCommunityEvents(communityId, startDate, endDate);
      
      set((state) => ({
        events: {
          ...state.events,
          [communityId]: events
        },
        loading: false
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load events',
        loading: false 
      });
    }
  },

  // Subscribe to real-time events
  subscribeToEvents: (communityId, startDate, endDate) => {
    const { unsubscribers } = get();
    
    // Unsubscribe from existing subscription if any
    if (unsubscribers[communityId]) {
      unsubscribers[communityId]();
    }
    
    const unsubscribe = subscribeToEvents(
      communityId,
      (events) => {
        set((state) => ({
          events: {
            ...state.events,
            [communityId]: events
          }
        }));
      },
      startDate,
      endDate
    );
    
    set((state) => ({
      unsubscribers: {
        ...state.unsubscribers,
        [communityId]: unsubscribe
      }
    }));
  },

  // Unsubscribe from events
  unsubscribeFromEvents: (communityId) => {
    const { unsubscribers } = get();
    
    if (unsubscribers[communityId]) {
      unsubscribers[communityId]();
      
      set((state) => {
        const newUnsubscribers = { ...state.unsubscribers };
        delete newUnsubscribers[communityId];
        return { unsubscribers: newUnsubscribers };
      });
    }
  },

  // Create a new event (admin only)
  createEvent: async (communityId, eventData) => {
    set({ loading: true, error: null });
    
    try {
      const { user } = useAuthStore.getState();
      if (!user) throw new Error('User not authenticated');
      
      const newEventData = {
        ...eventData,
        communityId,
        createdBy: user.uid,
        createdByName: user.displayName || user.email || 'Unknown User'
      };
      
      const newEvent = await createEventService(newEventData);
      
      // Don't manually update local state - let the real-time subscription handle it
      // This prevents duplicate entries since the subscription will automatically
      // receive the new event from Firebase
      set({ loading: false });
      
      return newEvent;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create event',
        loading: false 
      });
      throw error;
    }
  },

  // Update an existing event (admin only)
  updateEvent: async (communityId, eventId, updates) => {
    set({ loading: true, error: null });
    
    try {
      await updateEventService(communityId, eventId, updates);
      
      // Update local state
      set((state) => {
        const communityEvents = state.events[communityId] || [];
        const eventIndex = communityEvents.findIndex(e => e.id === eventId);
        
        if (eventIndex !== -1) {
          const updatedEvents = [...communityEvents];
          updatedEvents[eventIndex] = {
            ...updatedEvents[eventIndex],
            ...updates
          };
          
          return {
            events: {
              ...state.events,
              [communityId]: updatedEvents
            },
            loading: false
          };
        }
        
        return { loading: false };
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update event',
        loading: false 
      });
    }
  },

  // Delete an event (admin only)
  deleteEvent: async (communityId, eventId) => {
    set({ loading: true, error: null });
    
    try {
      await deleteEventService(communityId, eventId);
      
      // Remove from local state
      set((state) => ({
        events: {
          ...state.events,
          [communityId]: (state.events[communityId] || []).filter(e => e.id !== eventId)
        },
        loading: false
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete event',
        loading: false 
      });
    }
  },



  // Calendar navigation
  setSelectedDate: (date) => {
    set({ selectedDate: date });
  },

  navigateCalendar: (direction) => {
    const { selectedDate } = get();
    const newDate = new Date(selectedDate);
    
    // Only handle month navigation
    newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
    
    set({ selectedDate: newDate });
  },

  goToToday: () => {
    set({ selectedDate: new Date() });
  },

  // Utility functions
  getEventsForDateLocal: (date, communityId) => {
    const { events } = get();
    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);
    
    const allEvents = communityId 
      ? events[communityId] || []
      : Object.values(events).flat();
    
    return allEvents.filter(event => {
      const eventDate = new Date(event.startTime);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate.getTime() === targetDate.getTime();
    });
  },

  getUpcomingEvents: (communityId, limit = 5) => {
    const { events } = get();
    const now = new Date();
    
    const allEvents = communityId 
      ? events[communityId] || []
      : Object.values(events).flat();
    
    return allEvents
      .filter(event => new Date(event.startTime) > now)
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .slice(0, limit);
  },


}));
