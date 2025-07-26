import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import { getSafeFirebaseConfig } from './firebaseConfig';

// Mock creation functions (defined first to avoid hoisting issues)
const createMockAuth = () => ({
  currentUser: null,
  onAuthStateChanged: (callback: any) => {
    console.warn('🚫 Authentication disabled - running in demo mode');
    setTimeout(() => callback(null), 100);
    return () => {};
  },
  signInWithEmailAndPassword: () => Promise.reject(new Error('Demo Mode: Authentication is disabled. To enable authentication, configure real Firebase environment variables.')),
  createUserWithEmailAndPassword: () => Promise.reject(new Error('Demo Mode: Authentication is disabled. To enable authentication, configure real Firebase environment variables.')),
  signOut: () => Promise.resolve(),
  signInWithPopup: () => Promise.reject(new Error('Demo Mode: Authentication is disabled. To enable authentication, configure real Firebase environment variables.'))
});

const createMockFirestore = () => {
  const mockFirestore = {
    _delegate: {},
    _databaseId: { projectId: 'mock-project', database: '(default)' },
    type: 'firestore',
    app: { name: 'mock-app' },
    settings: {},
  };

  Object.defineProperty(mockFirestore, Symbol.toStringTag, {
    value: 'Firestore',
    configurable: false
  });

  return mockFirestore;
};

const createMockStorage = () => ({
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
    child: (childPath: string) => createMockStorage().ref(`${path}/${childPath}`)
  })
});

// Initialize Firebase with automated error handling
let app: any;
let auth: any;
let db: any;
let storage: any;
let functions: any;

// Get Firebase configuration safely
const { config: firebaseConfig, isValid: configValid } = getSafeFirebaseConfig();

if (configValid) {
  try {
    console.log('🔥 Initializing Firebase for project:', firebaseConfig.projectId);

    // Initialize Firebase
    app = initializeApp(firebaseConfig);

    // Initialize Firebase services
    auth = getAuth(app);
    
    // CRITICAL FIX: Disable Firebase auth persistence to prevent auto re-authentication after signout
    import('firebase/auth').then(({ setPersistence, browserSessionPersistence }) => {
      setPersistence(auth, browserSessionPersistence).catch((error) => {
        console.warn('⚠️ Failed to set auth persistence:', error);
      });
    });
    
    db = getFirestore(app);
    storage = getStorage(app);
    functions = getFunctions(app);

    console.log('✅ Firebase initialized successfully');

  } catch (error: any) {
    console.error('❌ Firebase initialization failed:', error);
    // Fall through to demo mode
  }
}

// If Firebase initialization failed or config is invalid, use demo mode
if (!app || !db) {
  console.warn('🔄 Falling back to demo mode');
  console.warn('📋 Authentication will be disabled to prevent API key errors');

  try {
    // Try to initialize with demo config for Firestore compatibility
    const demoConfig = {
      apiKey: "AIzaSyDemo-Key-For-Testing-Only",
      authDomain: "demo-project.firebaseapp.com",
      projectId: "demo-project",
      storageBucket: "demo-project.appspot.com",
      messagingSenderId: "123456789012",
      appId: "1:123456789012:web:demo"
    };

    app = initializeApp(demoConfig, 'demo-app');

    // Initialize Firestore and Storage (these work with demo config)
    db = getFirestore(app);
    storage = getStorage(app);
    functions = getFunctions(app);

    // Use mock auth to prevent API key errors
    auth = createMockAuth();

    console.log('✅ Demo Firebase services initialized (auth disabled)');

  } catch (demoError) {
    console.warn('⚠️ Complete fallback to mocks');

    app = { name: 'mock-app' };
    auth = createMockAuth();
    db = createMockFirestore();
    storage = createMockStorage();
    functions = {};
  }
}
// Export Firebase services
export { auth, db, storage, functions };
export default app;

// Utility functions
export const isFirebaseInitialized = () => !!app;
export const isFirebaseConnected = () => {
  try {
    return !!app && !!auth && !!db && (app.name !== 'demo-app' && app.name !== 'mock-app');
  } catch {
    return false;
  }
};
