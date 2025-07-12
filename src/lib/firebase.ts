import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { getSafeFirebaseConfig } from './firebaseConfig';

// Initialize Firebase with automated error handling
let app: any;
let auth: any;
let db: any;
let storage: any;
let functions: any;

// Get Firebase configuration safely
const { config: firebaseConfig, isValid: configValid } = getSafeFirebaseConfig();
let firebaseInitialized = false;

if (configValid) {
  try {
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

    firebaseInitialized = true;

  } catch (error: any) {
    console.error('❌ Firebase initialization failed:', error);
    firebaseInitialized = false;
  }
}

if (!firebaseInitialized) {
  console.warn('🔄 Firebase configuration invalid - falling back to demo mode with mock services');
  console.warn('📋 To enable full functionality:');
  console.warn('   1. Go to https://console.firebase.google.com');
  console.warn('   2. Select your grp-study project');
  console.warn('   3. Go to Project Settings → General → Your apps');
  console.warn('   4. Copy the real configuration values');
  console.warn('   5. Set environment variables in Netlify:');
  console.warn('      VITE_FIREBASE_API_KEY=your_real_api_key');
  console.warn('      VITE_FIREBASE_APP_ID=your_real_app_id');
  console.warn('      VITE_FIREBASE_MESSAGING_SENDER_ID=your_real_sender_id');

  // Create mock services that won't break the app
  auth = {
    currentUser: null,
    onAuthStateChanged: (callback: any) => {
      console.warn('🚫 Authentication disabled - Firebase not configured');
      setTimeout(() => callback(null), 100);
      return () => {};
    },
    signInWithEmailAndPassword: () => Promise.reject(new Error('Authentication unavailable: Please configure Firebase environment variables')),
    createUserWithEmailAndPassword: () => Promise.reject(new Error('Authentication unavailable: Please configure Firebase environment variables')),
    signOut: () => Promise.resolve(),
    signInWithPopup: () => Promise.reject(new Error('Authentication unavailable: Please configure Firebase environment variables'))
  };

  // Create a more robust mock Firestore implementation
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
      // Call callback with empty data
      setTimeout(() => callback({ exists: false, data: () => null }), 100);
      return () => {}; // Unsubscribe function
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
      // Call callback with empty collection
      setTimeout(() => callback({ docs: [], empty: true, size: 0 }), 100);
      return () => {}; // Unsubscribe function
    }
  });

  db = {
    collection: (path: string) => createMockCollection(),
    doc: (path: string) => createMockDoc(),
    // Add other Firestore methods that might be used
    runTransaction: () => Promise.resolve(),
    batch: () => ({
      set: () => {},
      update: () => {},
      delete: () => {},
      commit: () => Promise.resolve()
    })
  };

  // Create mock storage implementation
  storage = {
    ref: (path?: string) => ({
      put: (data: any) => Promise.resolve({
        ref: {
          getDownloadURL: () => Promise.resolve('https://via.placeholder.com/150'),
          fullPath: path || 'mock-path',
          name: 'mock-file'
        },
        metadata: {
          size: 1024,
          contentType: 'image/jpeg'
        }
      }),
      getDownloadURL: () => Promise.resolve('https://via.placeholder.com/150'),
      delete: () => Promise.resolve(),
      child: (childPath: string) => storage.ref(`${path}/${childPath}`)
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
