import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  Timestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Event } from '../types';

// Create a new event
export const createEvent = async (eventData: Omit<Event, 'id' | 'createdAt'>): Promise<Event> => {
  try {
    const eventsRef = collection(db, 'communities', eventData.communityId, 'events');
    
    const newEvent = {
      ...eventData,
      startTime: Timestamp.fromDate(eventData.startTime),
      createdAt: Timestamp.now()
    };
    
    const docRef = await addDoc(eventsRef, newEvent);
    
    return {
      id: docRef.id,
      ...eventData,
      createdAt: new Date()
    };
  } catch (error) {
    console.error('Error creating event:', error);
    throw new Error('Failed to create event');
  }
};

// Update an existing event
export const updateEvent = async (communityId: string, eventId: string, updates: Partial<Event>): Promise<void> => {
  try {
    const eventRef = doc(db, 'communities', communityId, 'events', eventId);
    
    const updateData: any = { ...updates };
    if (updates.startTime) {
      updateData.startTime = Timestamp.fromDate(updates.startTime);
    }
    
    await updateDoc(eventRef, updateData);
  } catch (error) {
    console.error('Error updating event:', error);
    throw new Error('Failed to update event');
  }
};

// Delete an event
export const deleteEvent = async (communityId: string, eventId: string): Promise<void> => {
  try {
    const eventRef = doc(db, 'communities', communityId, 'events', eventId);
    await deleteDoc(eventRef);
  } catch (error) {
    console.error('Error deleting event:', error);
    throw new Error('Failed to delete event');
  }
};

// Get events for a community within a date range
export const getCommunityEvents = async (
  communityId: string, 
  startDate?: Date, 
  endDate?: Date
): Promise<Event[]> => {
  try {
    const eventsRef = collection(db, 'communities', communityId, 'events');
    let q = query(eventsRef, orderBy('startTime', 'asc'));
    
    if (startDate) {
      q = query(q, where('startTime', '>=', Timestamp.fromDate(startDate)));
    }
    
    if (endDate) {
      q = query(q, where('startTime', '<=', Timestamp.fromDate(endDate)));
    }
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        startTime: data.startTime.toDate(),
        createdAt: data.createdAt.toDate()
      } as Event;
    });
  } catch (error) {
    console.error('Error fetching community events:', error);
    throw new Error('Failed to fetch events');
  }
};

// Subscribe to real-time events for a community
export const subscribeToEvents = (
  communityId: string,
  callback: (events: Event[]) => void,
  startDate?: Date,
  endDate?: Date
) => {
  try {
    const eventsRef = collection(db, 'communities', communityId, 'events');
    let q = query(eventsRef, orderBy('startTime', 'asc'));
    
    if (startDate) {
      q = query(q, where('startTime', '>=', Timestamp.fromDate(startDate)));
    }
    
    if (endDate) {
      q = query(q, where('startTime', '<=', Timestamp.fromDate(endDate)));
    }
    
    return onSnapshot(q, (snapshot) => {
      const events = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          startTime: data.startTime.toDate(),
          createdAt: data.createdAt.toDate()
        } as Event;
      });
      
      callback(events);
    });
  } catch (error) {
    console.error('Error subscribing to events:', error);
    return () => {}; // Return empty unsubscribe function
  }
};

// Get events for a specific date
export const getEventsForDate = async (communityId: string, date: Date): Promise<Event[]> => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return getCommunityEvents(communityId, startOfDay, endOfDay);
};