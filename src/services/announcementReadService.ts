import {
  collection,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/authStore';

interface AnnouncementRead {
  userId: string;
  communityId: string;
  lastReadTimestamp: Date;
  readAnnouncementIds: string[];
  updatedAt: Date;
}

class AnnouncementReadService {
  private unsubscribers: Map<string, () => void> = new Map();

  // Mark announcement as read
  async markAnnouncementAsRead(communityId: string, announcementId: string): Promise<void> {
    const { user } = useAuthStore.getState();
    if (!user) return;

    try {
      const readDocRef = doc(db, 'announcementReads', `${user.uid}_${communityId}`);
      const readDoc = await getDoc(readDocRef);
      
      let readAnnouncementIds: string[] = [];
      
      if (readDoc.exists()) {
        const data = readDoc.data();
        readAnnouncementIds = data.readAnnouncementIds || [];
      }
      
      // Add announcement ID if not already read
      if (!readAnnouncementIds.includes(announcementId)) {
        readAnnouncementIds.push(announcementId);
      }
      
      await setDoc(readDocRef, {
        userId: user.uid,
        communityId,
        lastReadTimestamp: serverTimestamp(),
        readAnnouncementIds,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      console.log('✅ [ANNOUNCEMENT_READ] Marked announcement as read:', announcementId);
    } catch (error) {
      console.error('❌ [ANNOUNCEMENT_READ] Failed to mark announcement as read:', error);
    }
  }

  // Mark all announcements in community as read
  async markAllAnnouncementsAsRead(communityId: string, announcementIds: string[]): Promise<void> {
    const { user } = useAuthStore.getState();
    if (!user) return;

    try {
      const readDocRef = doc(db, 'announcementReads', `${user.uid}_${communityId}`);
      
      await setDoc(readDocRef, {
        userId: user.uid,
        communityId,
        lastReadTimestamp: serverTimestamp(),
        readAnnouncementIds: announcementIds,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      console.log('✅ [ANNOUNCEMENT_READ] Marked all announcements as read for community:', communityId);
    } catch (error) {
      console.error('❌ [ANNOUNCEMENT_READ] Failed to mark all announcements as read:', error);
    }
  }

  // Get read status for announcements
  async getReadStatus(communityId: string): Promise<string[]> {
    const { user } = useAuthStore.getState();
    if (!user) return [];

    try {
      const readDocRef = doc(db, 'announcementReads', `${user.uid}_${communityId}`);
      const readDoc = await getDoc(readDocRef);
      
      if (readDoc.exists()) {
        const data = readDoc.data();
        return data.readAnnouncementIds || [];
      }
      
      return [];
    } catch (error) {
      console.error('❌ [ANNOUNCEMENT_READ] Failed to get read status:', error);
      return [];
    }
  }

  // Subscribe to read status changes
  subscribeToReadStatus(
    communityId: string, 
    callback: (readAnnouncementIds: string[]) => void
  ): () => void {
    const { user } = useAuthStore.getState();
    if (!user) return () => {};

    const readDocRef = doc(db, 'announcementReads', `${user.uid}_${communityId}`);
    
    const unsubscribe = onSnapshot(readDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        callback(data.readAnnouncementIds || []);
      } else {
        callback([]);
      }
    }, (error) => {
      console.error('❌ [ANNOUNCEMENT_READ] Read status subscription error:', error);
      callback([]);
    });

    // Store unsubscriber
    const key = `${user.uid}_${communityId}`;
    this.unsubscribers.set(key, unsubscribe);
    
    return unsubscribe;
  }

  // Cleanup subscriptions
  unsubscribeAll(): void {
    this.unsubscribers.forEach((unsubscribe) => {
      unsubscribe();
    });
    this.unsubscribers.clear();
  }

  // Unsubscribe from specific community
  unsubscribeFromCommunity(communityId: string): void {
    const { user } = useAuthStore.getState();
    if (!user) return;

    const key = `${user.uid}_${communityId}`;
    const unsubscribe = this.unsubscribers.get(key);
    if (unsubscribe) {
      unsubscribe();
      this.unsubscribers.delete(key);
    }
  }
}

export const announcementReadService = new AnnouncementReadService();