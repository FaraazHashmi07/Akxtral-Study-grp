import { 
  collection, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  updateDoc, 
  doc, 
  onSnapshot,
  Unsubscribe 
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface UserNotification {
  id: string;
  userId: string;
  type: 'join_request_approved' | 'join_request_rejected' | 'community_deleted';
  title: string;
  message: string;
  data: any;
  read: boolean;
  createdAt: Date;
}

const notificationsRef = collection(db, 'notifications');

// Get notifications for a user
export const getUserNotifications = async (userId: string): Promise<UserNotification[]> => {
  try {
    console.log('📬 [NOTIFICATIONS] Loading notifications for user:', userId);
    
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    const notifications: UserNotification[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      notifications.push({
        id: doc.id,
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data || {},
        read: data.read || false,
        createdAt: data.createdAt?.toDate() || new Date()
      });
    });
    
    console.log('✅ [NOTIFICATIONS] Loaded notifications:', notifications.length);
    return notifications;
  } catch (error) {
    console.error('❌ [NOTIFICATIONS] Failed to load notifications:', error);
    return [];
  }
};

// Get unread notification count
export const getUnreadNotificationCount = async (userId: string): Promise<number> => {
  try {
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('read', '==', false)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('❌ [NOTIFICATIONS] Failed to get unread count:', error);
    return 0;
  }
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  try {
    await updateDoc(doc(notificationsRef, notificationId), {
      read: true
    });
    console.log('✅ [NOTIFICATIONS] Marked notification as read:', notificationId);
  } catch (error) {
    console.error('❌ [NOTIFICATIONS] Failed to mark notification as read:', error);
  }
};

// Mark all notifications as read for a user
export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  try {
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('read', '==', false)
    );
    
    const snapshot = await getDocs(q);
    const updatePromises = snapshot.docs.map(doc => 
      updateDoc(doc.ref, { read: true })
    );
    
    await Promise.all(updatePromises);
    console.log('✅ [NOTIFICATIONS] Marked all notifications as read for user:', userId);
  } catch (error) {
    console.error('❌ [NOTIFICATIONS] Failed to mark all notifications as read:', error);
  }
};

// Subscribe to real-time notifications for a user
export const subscribeToUserNotifications = (
  userId: string,
  callback: (notifications: UserNotification[]) => void
): Unsubscribe => {
  console.log('🔔 [NOTIFICATIONS] Subscribing to real-time notifications for user:', userId);
  
  const q = query(
    notificationsRef,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const notifications: UserNotification[] = [];
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      notifications.push({
        id: doc.id,
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data || {},
        read: data.read || false,
        createdAt: data.createdAt?.toDate() || new Date()
      });
    });
    
    console.log('🔔 [NOTIFICATIONS] Real-time update:', notifications.length, 'notifications');
    callback(notifications);
  }, (error) => {
    console.error('❌ [NOTIFICATIONS] Real-time subscription error:', error);
  });
};
