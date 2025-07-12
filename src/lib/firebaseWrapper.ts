// Firebase Wrapper - Safe Firebase operations that never crash
import { db, auth, storage, isFirebaseConnected } from './firebase';

// Safe Firestore operations
export const safeFirestore = {
  // Collection operations
  collection: async (path: string) => {
    if (!isFirebaseConnected()) {
      console.warn(`🚫 Firestore not available - mocking collection: ${path}`);
      return createMockCollection();
    }

    try {
      const { collection } = await import('firebase/firestore');
      return collection(db, path);
    } catch (error) {
      console.warn(`🚫 Collection operation failed for: ${path}`, error);
      return createMockCollection();
    }
  },

  // Document operations
  doc: async (path: string) => {
    if (!isFirebaseConnected()) {
      console.warn(`🚫 Firestore not available - mocking document: ${path}`);
      return createMockDoc();
    }

    try {
      const { doc } = await import('firebase/firestore');
      return doc(db, path);
    } catch (error) {
      console.warn(`🚫 Document operation failed for: ${path}`, error);
      return createMockDoc();
    }
  },

  // Query operations
  getDocs: async (query: any) => {
    if (!isFirebaseConnected()) {
      console.warn('🚫 Firestore not available - returning empty query result');
      return { docs: [], empty: true, size: 0, forEach: () => {} };
    }

    try {
      const { getDocs } = await import('firebase/firestore');
      return await getDocs(query);
    } catch (error) {
      console.warn('🚫 Query operation failed', error);
      return { docs: [], empty: true, size: 0, forEach: () => {} };
    }
  },

  // Real-time operations
  onSnapshot: (query: any, callback: any) => {
    if (!isFirebaseConnected()) {
      console.warn('🚫 Firestore not available - mocking real-time subscription');
      setTimeout(() => callback({ docs: [], empty: true, size: 0 }), 100);
      return () => {}; // Unsubscribe function
    }

    try {
      import('firebase/firestore').then(({ onSnapshot }) => {
        return onSnapshot(query, callback);
      }).catch((error) => {
        console.warn('🚫 Real-time subscription failed', error);
        setTimeout(() => callback({ docs: [], empty: true, size: 0 }), 100);
        return () => {};
      });
    } catch (error) {
      console.warn('🚫 Real-time subscription setup failed', error);
      setTimeout(() => callback({ docs: [], empty: true, size: 0 }), 100);
      return () => {};
    }
  }
};

// Safe Authentication operations
export const safeAuth = {
  signInWithEmailAndPassword: async (email: string, password: string) => {
    if (!isFirebaseConnected()) {
      throw new Error('Authentication unavailable: Please configure Firebase environment variables');
    }

    try {
      const { signInWithEmailAndPassword } = await import('firebase/auth');
      return await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('🚫 Email sign-in failed', error);
      throw error;
    }
  },

  signInWithPopup: async (provider: any) => {
    if (!isFirebaseConnected()) {
      throw new Error('Authentication unavailable: Please configure Firebase environment variables');
    }

    try {
      const { signInWithPopup } = await import('firebase/auth');
      return await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('🚫 Popup sign-in failed', error);
      throw error;
    }
  },

  createUserWithEmailAndPassword: async (email: string, password: string) => {
    if (!isFirebaseConnected()) {
      throw new Error('Authentication unavailable: Please configure Firebase environment variables');
    }

    try {
      const { createUserWithEmailAndPassword } = await import('firebase/auth');
      return await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error('🚫 User creation failed', error);
      throw error;
    }
  },

  signOut: async () => {
    if (!isFirebaseConnected()) {
      console.warn('🚫 Auth not available - mock sign out');
      return Promise.resolve();
    }

    try {
      const { signOut } = await import('firebase/auth');
      return await signOut(auth);
    } catch (error) {
      console.error('🚫 Sign out failed', error);
      throw error;
    }
  }
};

// Mock implementations
const createMockDoc = () => ({
  get: () => Promise.resolve({ 
    exists: false, 
    data: () => null,
    id: 'mock-doc-id'
  }),
  set: () => Promise.resolve(),
  update: () => Promise.resolve(),
  delete: () => Promise.resolve(),
  onSnapshot: (callback: any) => {
    setTimeout(() => callback({ exists: false, data: () => null }), 100);
    return () => {};
  }
});

const createMockCollection = () => ({
  doc: (id?: string) => createMockDoc(),
  add: () => Promise.resolve({ id: 'mock-doc-id', ...createMockDoc() }),
  get: () => Promise.resolve({ 
    docs: [],
    empty: true,
    size: 0,
    forEach: () => {}
  }),
  where: () => createMockCollection(),
  orderBy: () => createMockCollection(),
  limit: () => createMockCollection(),
  onSnapshot: (callback: any) => {
    setTimeout(() => callback({ docs: [], empty: true, size: 0 }), 100);
    return () => {};
  }
});

// Export safe Firebase operations
export { auth, db, storage };
export default { safeFirestore, safeAuth };
