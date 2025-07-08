import { create } from 'zustand';
import { Event, EventRSVP } from '../types';

interface EventState {
  // State
  events: Record<string, Event[]>; // communityId -> events
  userRSVPs: Record<string, EventRSVP>; // eventId -> user's RSVP
  loading: boolean;
  error: string | null;
  
  // Calendar view state
  calendarView: 'month' | 'week' | 'day' | 'agenda';
  selectedDate: Date;
  
  // Actions
  loadEvents: (communityId: string, startDate?: Date, endDate?: Date) => Promise<void>;
  createEvent: (communityId: string, eventData: Partial<Event>) => Promise<Event>;
  updateEvent: (eventId: string, updates: Partial<Event>) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  
  // RSVP management
  rsvpToEvent: (eventId: string, status: 'yes' | 'no' | 'maybe', note?: string) => Promise<void>;
  loadEventRSVPs: (eventId: string) => Promise<EventRSVP[]>;
  
  // Calendar navigation
  setCalendarView: (view: 'month' | 'week' | 'day' | 'agenda') => void;
  setSelectedDate: (date: Date) => void;
  navigateCalendar: (direction: 'prev' | 'next') => void;
  goToToday: () => void;
  
  // Utility functions
  getEventsForDate: (date: Date, communityId?: string) => Event[];
  getUpcomingEvents: (communityId?: string, limit?: number) => Event[];
  getUserEvents: (userId: string) => Event[];
}

export const useEventStore = create<EventState>((set, get) => ({
  // Initial state
  events: {},
  userRSVPs: {},
  loading: false,
  error: null,
  calendarView: 'month',
  selectedDate: new Date(),

  // Load events for a community within a date range
  loadEvents: async (communityId, startDate, endDate) => {
    set({ loading: true, error: null });
    try {
      // TODO: Implement Firestore query for community events
      // const events = await getCommunityEvents(communityId, startDate, endDate);
      const events: Event[] = []; // Placeholder
      
      const { events: currentEvents } = get();
      set({
        events: {
          ...currentEvents,
          [communityId]: events
        },
        loading: false
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load events',
        loading: false 
      });
    }
  },

  // Create a new event (admin only)
  createEvent: async (communityId, eventData) => {
    set({ loading: true, error: null });
    try {
      // TODO: Implement Firestore event creation
      // const event = await createEventInFirestore(communityId, eventData);
      const event: Event = {
        id: `event_${Date.now()}`,
        communityId,
        title: eventData.title || '',
        description: eventData.description || '',
        startTime: eventData.startTime || new Date(),
        endTime: eventData.endTime || new Date(),
        type: eventData.type || 'study_session',
        createdBy: 'current-user', // TODO: Get from auth store
        createdAt: new Date(),
        rsvps: [],
        isRecurring: eventData.isRecurring || false,
        ...eventData
      };
      
      const { events } = get();
      const communityEvents = events[communityId] || [];
      
      set({
        events: {
          ...events,
          [communityId]: [...communityEvents, event]
        },
        loading: false
      });
      
      return event;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create event',
        loading: false 
      });
      throw error;
    }
  },

  // Update an existing event (admin only)
  updateEvent: async (eventId, updates) => {
    set({ loading: true, error: null });
    try {
      // TODO: Implement Firestore event update
      // await updateEventInFirestore(eventId, updates);
      
      const { events } = get();
      
      // Update event in all communities
      const updatedEvents = Object.keys(events).reduce((acc, communityId) => {
        acc[communityId] = events[communityId].map(e => 
          e.id === eventId ? { ...e, ...updates } : e
        );
        return acc;
      }, {} as Record<string, Event[]>);
      
      set({
        events: updatedEvents,
        loading: false
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to update event',
        loading: false 
      });
    }
  },

  // Delete an event (admin only)
  deleteEvent: async (eventId) => {
    set({ loading: true, error: null });
    try {
      // TODO: Implement Firestore event deletion
      // await deleteEventFromFirestore(eventId);
      
      const { events, userRSVPs } = get();
      
      // Remove event from all communities
      const updatedEvents = Object.keys(events).reduce((acc, communityId) => {
        acc[communityId] = events[communityId].filter(e => e.id !== eventId);
        return acc;
      }, {} as Record<string, Event[]>);
      
      // Remove user's RSVP for this event
      const { [eventId]: removedRSVP, ...remainingRSVPs } = userRSVPs;
      
      set({
        events: updatedEvents,
        userRSVPs: remainingRSVPs,
        loading: false
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to delete event',
        loading: false 
      });
    }
  },

  // RSVP to an event
  rsvpToEvent: async (eventId, status, note) => {
    try {
      // TODO: Implement Firestore RSVP creation/update
      // await createOrUpdateRSVP(eventId, status, note);
      
      const rsvp: EventRSVP = {
        userId: 'current-user', // TODO: Get from auth store
        status,
        respondedAt: new Date(),
        note
      };
      
      const { userRSVPs, events } = get();
      
      // Update user's RSVP
      set({
        userRSVPs: {
          ...userRSVPs,
          [eventId]: rsvp
        }
      });
      
      // Update event's RSVP list
      const updatedEvents = Object.keys(events).reduce((acc, communityId) => {
        acc[communityId] = events[communityId].map(e => {
          if (e.id === eventId) {
            const existingRSVPIndex = e.rsvps.findIndex(r => r.userId === rsvp.userId);
            const updatedRSVPs = [...e.rsvps];
            
            if (existingRSVPIndex >= 0) {
              updatedRSVPs[existingRSVPIndex] = rsvp;
            } else {
              updatedRSVPs.push(rsvp);
            }
            
            return { ...e, rsvps: updatedRSVPs };
          }
          return e;
        });
        return acc;
      }, {} as Record<string, Event[]>);
      
      set({ events: updatedEvents });
    } catch (error) {
      console.error('Failed to RSVP to event:', error);
    }
  },

  // Load RSVPs for a specific event
  loadEventRSVPs: async (eventId) => {
    try {
      // TODO: Implement Firestore query for event RSVPs
      // const rsvps = await getEventRSVPs(eventId);
      const rsvps: EventRSVP[] = []; // Placeholder
      return rsvps;
    } catch (error) {
      console.error('Failed to load event RSVPs:', error);
      return [];
    }
  },

  // Calendar view management
  setCalendarView: (view) => {
    set({ calendarView: view });
  },

  setSelectedDate: (date) => {
    set({ selectedDate: date });
  },

  navigateCalendar: (direction) => {
    const { selectedDate, calendarView } = get();
    const newDate = new Date(selectedDate);
    
    switch (calendarView) {
      case 'month':
        newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
      case 'day':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        break;
      case 'agenda':
        newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        break;
    }
    
    set({ selectedDate: newDate });
  },

  goToToday: () => {
    set({ selectedDate: new Date() });
  },

  // Utility functions
  getEventsForDate: (date, communityId) => {
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

  getUserEvents: (userId) => {
    const { events, userRSVPs } = get();
    const allEvents = Object.values(events).flat();
    
    return allEvents.filter(event => {
      // Include events created by user or events they've RSVP'd to
      return event.createdBy === userId || 
             (userRSVPs[event.id] && userRSVPs[event.id].status === 'yes');
    });
  }
}));
