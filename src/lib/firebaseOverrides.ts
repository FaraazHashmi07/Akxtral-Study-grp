// Firebase Function Overrides - Intercept Firebase calls and handle them safely
import { isFirebaseConnected } from './firebase';

// Mock data structures
const createMockDoc = () => ({
  exists: false,
  data: () => null,
  id: 'mock-doc-id',
  ref: { id: 'mock-doc-id', path: 'mock/path' }
});

const createMockQuerySnapshot = () => ({
  docs: [],
  empty: true,
  size: 0,
  forEach: () => {},
  metadata: { hasPendingWrites: false, fromCache: true }
});

const createMockDocRef = () => ({
  id: 'mock-doc-id',
  path: 'mock/path',
  parent: null,
  firestore: null
});

const createMockCollectionRef = () => ({
  id: 'mock-collection',
  path: 'mock',
  parent: null,
  firestore: null
});

// Override Firebase functions to handle mock database gracefully
export const safeFirebaseOperations = {
  // Collection function override
  collection: (db: any, path: string) => {
    if (!isFirebaseConnected()) {
      console.warn(`🚫 Firestore not available - mocking collection: ${path}`);
      return createMockCollectionRef();
    }
    
    // If Firebase is connected, use the real function
    try {
      return import('firebase/firestore').then(({ collection }) => collection(db, path));
    } catch (error) {
      console.warn(`🚫 Collection operation failed for: ${path}`, error);
      return createMockCollectionRef();
    }
  },

  // Document function override
  doc: (db: any, path: string) => {
    if (!isFirebaseConnected()) {
      console.warn(`🚫 Firestore not available - mocking document: ${path}`);
      return createMockDocRef();
    }
    
    try {
      return import('firebase/firestore').then(({ doc }) => doc(db, path));
    } catch (error) {
      console.warn(`🚫 Document operation failed for: ${path}`, error);
      return createMockDocRef();
    }
  },

  // Query function overrides
  getDocs: async (query: any) => {
    if (!isFirebaseConnected()) {
      console.warn('🚫 Firestore not available - returning empty query result');
      return createMockQuerySnapshot();
    }
    
    try {
      const { getDocs } = await import('firebase/firestore');
      return await getDocs(query);
    } catch (error) {
      console.warn('🚫 Query operation failed', error);
      return createMockQuerySnapshot();
    }
  },

  getDoc: async (docRef: any) => {
    if (!isFirebaseConnected()) {
      console.warn('🚫 Firestore not available - returning mock document');
      return createMockDoc();
    }
    
    try {
      const { getDoc } = await import('firebase/firestore');
      return await getDoc(docRef);
    } catch (error) {
      console.warn('🚫 Document get operation failed', error);
      return createMockDoc();
    }
  },

  // Real-time operations
  onSnapshot: (query: any, callback: any) => {
    if (!isFirebaseConnected()) {
      console.warn('🚫 Firestore not available - mocking real-time subscription');
      setTimeout(() => callback(createMockQuerySnapshot()), 100);
      return () => {}; // Unsubscribe function
    }

    try {
      import('firebase/firestore').then(({ onSnapshot }) => {
        return onSnapshot(query, callback);
      }).catch((error) => {
        console.warn('🚫 Real-time subscription failed', error);
        setTimeout(() => callback(createMockQuerySnapshot()), 100);
        return () => {};
      });
    } catch (error) {
      console.warn('🚫 Real-time subscription setup failed', error);
      setTimeout(() => callback(createMockQuerySnapshot()), 100);
      return () => {};
    }
  },

  // Write operations
  addDoc: async (collectionRef: any, data: any) => {
    if (!isFirebaseConnected()) {
      console.warn('🚫 Firestore not available - mocking document creation');
      return { id: 'mock-doc-id', ...createMockDocRef() };
    }
    
    try {
      const { addDoc } = await import('firebase/firestore');
      return await addDoc(collectionRef, data);
    } catch (error) {
      console.warn('🚫 Document creation failed', error);
      return { id: 'mock-doc-id', ...createMockDocRef() };
    }
  },

  setDoc: async (docRef: any, data: any) => {
    if (!isFirebaseConnected()) {
      console.warn('🚫 Firestore not available - mocking document set');
      return Promise.resolve();
    }
    
    try {
      const { setDoc } = await import('firebase/firestore');
      return await setDoc(docRef, data);
    } catch (error) {
      console.warn('🚫 Document set operation failed', error);
      return Promise.resolve();
    }
  },

  updateDoc: async (docRef: any, data: any) => {
    if (!isFirebaseConnected()) {
      console.warn('🚫 Firestore not available - mocking document update');
      return Promise.resolve();
    }
    
    try {
      const { updateDoc } = await import('firebase/firestore');
      return await updateDoc(docRef, data);
    } catch (error) {
      console.warn('🚫 Document update operation failed', error);
      return Promise.resolve();
    }
  },

  deleteDoc: async (docRef: any) => {
    if (!isFirebaseConnected()) {
      console.warn('🚫 Firestore not available - mocking document deletion');
      return Promise.resolve();
    }
    
    try {
      const { deleteDoc } = await import('firebase/firestore');
      return await deleteDoc(docRef);
    } catch (error) {
      console.warn('🚫 Document deletion failed', error);
      return Promise.resolve();
    }
  },

  // Query builders
  query: (...args: any[]) => {
    if (!isFirebaseConnected()) {
      console.warn('🚫 Firestore not available - mocking query');
      return createMockCollectionRef();
    }
    
    try {
      return import('firebase/firestore').then(({ query }) => query(...args));
    } catch (error) {
      console.warn('🚫 Query building failed', error);
      return createMockCollectionRef();
    }
  },

  where: (field: string, operator: any, value: any) => {
    if (!isFirebaseConnected()) {
      console.warn('🚫 Firestore not available - mocking where clause');
      return {};
    }
    
    try {
      return import('firebase/firestore').then(({ where }) => where(field, operator, value));
    } catch (error) {
      console.warn('🚫 Where clause failed', error);
      return {};
    }
  },

  orderBy: (field: string, direction?: 'asc' | 'desc') => {
    if (!isFirebaseConnected()) {
      console.warn('🚫 Firestore not available - mocking orderBy clause');
      return {};
    }
    
    try {
      return import('firebase/firestore').then(({ orderBy }) => orderBy(field, direction));
    } catch (error) {
      console.warn('🚫 OrderBy clause failed', error);
      return {};
    }
  },

  limit: (limitCount: number) => {
    if (!isFirebaseConnected()) {
      console.warn('🚫 Firestore not available - mocking limit clause');
      return {};
    }
    
    try {
      return import('firebase/firestore').then(({ limit }) => limit(limitCount));
    } catch (error) {
      console.warn('🚫 Limit clause failed', error);
      return {};
    }
  }
};

export default safeFirebaseOperations;
