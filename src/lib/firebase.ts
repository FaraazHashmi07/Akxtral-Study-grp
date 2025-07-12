import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { getValidatedFirebaseConfig } from './firebaseConfig';

// Initialize Firebase with automated error handling
let app: any;
let auth: any;
let db: any;
let storage: any;
let functions: any;

try {
  // Get Firebase configuration using automated system
  const firebaseConfig = getValidatedFirebaseConfig();

  console.log('🔥 Initializing Firebase for project:', firebaseConfig.projectId);

  // Initialize Firebase
  app = initializeApp(firebaseConfig);

  // Initialize Firebase services
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
  functions = getFunctions(app);

  console.log('✅ Firebase initialized successfully');
  console.log('📍 Project ID:', firebaseConfig.projectId);
  console.log('📍 Auth Domain:', firebaseConfig.authDomain);

} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  console.warn('🔄 Falling back to demo mode with mock services');

  // Create mock services that won't break the app
  auth = {
    currentUser: null,
    onAuthStateChanged: (callback: any) => {
      console.warn('Demo mode: Authentication disabled');
      setTimeout(() => callback(null), 100);
      return () => {};
    },
    signInWithEmailAndPassword: () => Promise.reject(new Error('Demo mode: Please configure Firebase')),
    createUserWithEmailAndPassword: () => Promise.reject(new Error('Demo mode: Please configure Firebase')),
    signOut: () => Promise.resolve(),
    signInWithPopup: () => Promise.reject(new Error('Demo mode: Please configure Firebase'))
  };

  db = {
    collection: () => ({
      doc: () => ({
        get: () => Promise.resolve({ exists: false, data: () => null }),
        set: () => Promise.resolve(),
        update: () => Promise.resolve(),
        delete: () => Promise.resolve(),
        onSnapshot: () => () => {}
      }),
      add: () => Promise.resolve({ id: 'demo-id' }),
      where: () => ({ get: () => Promise.resolve({ docs: [] }) }),
      orderBy: () => ({ get: () => Promise.resolve({ docs: [] }) }),
      limit: () => ({ get: () => Promise.resolve({ docs: [] }) })
    })
  };

  storage = {
    ref: () => ({
      put: () => Promise.resolve({
        ref: {
          getDownloadURL: () => Promise.resolve('https://via.placeholder.com/150')
        }
      })
    })
  };

  functions = {};
  app = { name: 'demo-app' };
}

// Export Firebase services
export { auth, db, storage, functions };
export default app;

// Utility functions
export const isFirebaseInitialized = () => !!app;
export const isFirebaseConnected = () => {
  try {
    return !!app && !!auth && !!db && app.name !== 'demo-app';
  } catch {
    return false;
  }
};
