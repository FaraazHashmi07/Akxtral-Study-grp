import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Validate Firebase configuration
const requiredEnvVars = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_APP_ID'
];

const missingVars = requiredEnvVars.filter(varName => !import.meta.env[varName]);
if (missingVars.length > 0) {
  console.error('Missing required Firebase environment variables:', missingVars);
  console.error('Please configure these environment variables in:');
  console.error('- Local development: .env.local file');
  console.error('- Netlify deployment: Site Settings → Environment Variables');
  console.error('Get values from: Firebase Console → Project Settings → General → Your apps');
  throw new Error(`Missing Firebase configuration: ${missingVars.join(', ')}`);
}

console.log('Firebase config loaded for project:', firebaseConfig.projectId);

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Force production Firebase services - no emulators
console.log('🚀 Using production Firebase services');
console.log('📍 Project ID:', firebaseConfig.projectId);
console.log('📍 Auth Domain:', firebaseConfig.authDomain);
console.log('🗄️ Firestore Project:', firebaseConfig.projectId);

// Verify we're not using emulators
if (auth.config?.emulator) {
  console.warn('⚠️ Auth emulator detected - this should not happen in production mode');
}

// Log Firebase service initialization
console.log('✅ Firebase Auth initialized');
console.log('✅ Firestore initialized');
console.log('✅ Firebase Storage initialized');
console.log('✅ Firebase Functions initialized');

export default app;
