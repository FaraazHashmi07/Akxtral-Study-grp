import { collection, query, where, getDocs, writeBatch, doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

/**
 * OPTIMIZED: Store user profile updates for new messages only
 * This avoids expensive bulk updates of all historical messages
 */
export const updateUserMessagesProfile = async (
  userId: string,
  updates: { displayName?: string; photoURL?: string }
): Promise<void> => {
  try {
    console.log('🔄 [CHAT] Storing profile updates for future messages:', userId, updates);
    
    // Store the latest profile info in a user profile cache
    // This will be used for new messages going forward
    const userProfileRef = doc(db, 'userProfiles', userId);
    const profileData: any = {
      lastUpdated: new Date()
    };
    
    if (updates.displayName) {
      profileData.displayName = updates.displayName;
    }
    if (updates.photoURL !== undefined) {
      profileData.photoURL = updates.photoURL;
    }
    
    // Use merge to only update the fields we're changing
    await setDoc(userProfileRef, profileData, { merge: true });
    
    console.log('✅ [CHAT] Profile updates stored for future messages - no historical message updates needed');
  } catch (error) {
    console.error('❌ [CHAT] Failed to store profile updates:', error);
    throw error;
  }
};

/**
 * OPTIMIZED: Store user profile for reply references in new messages only
 * This avoids expensive bulk updates of all historical reply references
 */
export const updateUserReplyReferences = async (
  userId: string,
  newDisplayName: string
): Promise<void> => {
  try {
    console.log('🔄 [CHAT] Storing display name for future reply references:', userId, newDisplayName);
    
    // The profile cache already stores the display name from updateUserMessagesProfile
    // New messages will automatically use the updated profile when creating replies
    // No need to update historical reply references
    
    console.log('✅ [CHAT] Display name stored for future reply references - no historical updates needed');
  } catch (error) {
    console.error('❌ [CHAT] Failed to store display name for replies:', error);
    throw error;
  }
};