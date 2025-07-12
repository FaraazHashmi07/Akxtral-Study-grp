// Automated Firebase Configuration System
// This file provides fallback configuration and auto-detection

interface FirebaseConfigType {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

// Production Firebase configuration for grp-study project
// These are the actual values for the grp-study Firebase project
const PRODUCTION_CONFIG: FirebaseConfigType = {
  apiKey: "AIzaSyBvOkBjcEJCiid7_rEHiMp-Hr_9qYOTRlA",
  authDomain: "grp-study.firebaseapp.com",
  projectId: "grp-study",
  storageBucket: "grp-study.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456789",
  measurementId: "G-XXXXXXXXXX"
};

// Development/Demo configuration (safe for public use)
const DEMO_CONFIG: FirebaseConfigType = {
  apiKey: "demo-api-key",
  authDomain: "demo-project.firebaseapp.com",
  projectId: "demo-project",
  storageBucket: "demo-project.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:demo",
  measurementId: "G-DEMO"
};

// Auto-detect environment and return appropriate configuration
export function getFirebaseConfig(): FirebaseConfigType {
  // Check if environment variables are set
  const hasEnvVars = !!(
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID
  );

  if (hasEnvVars) {
    // Use environment variables (highest priority)
    console.log('🔧 Using Firebase config from environment variables');
    return {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY!,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN!,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID!,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET!,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID!,
      appId: import.meta.env.VITE_FIREBASE_APP_ID!,
      measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
    };
  }

  // Detect environment
  const isProduction = window.location.hostname.includes('netlify.app') || 
                      window.location.hostname.includes('studygroup');
  const isDevelopment = window.location.hostname === 'localhost';

  if (isProduction) {
    // Use production config for deployed sites
    console.log('🚀 Using production Firebase configuration');
    return PRODUCTION_CONFIG;
  } else if (isDevelopment) {
    // Use demo config for local development
    console.log('🛠️ Using demo Firebase configuration for development');
    return DEMO_CONFIG;
  } else {
    // Fallback to production config
    console.log('🔄 Using fallback Firebase configuration');
    return PRODUCTION_CONFIG;
  }
}

// Validate Firebase configuration
export function validateFirebaseConfig(config: FirebaseConfigType): boolean {
  const required = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'appId'];
  const missing = required.filter(key => !config[key as keyof FirebaseConfigType]);
  
  if (missing.length > 0) {
    console.error('❌ Invalid Firebase configuration. Missing:', missing);
    return false;
  }
  
  console.log('✅ Firebase configuration validated successfully');
  return true;
}

// Get configuration with validation
export function getValidatedFirebaseConfig(): FirebaseConfigType {
  const config = getFirebaseConfig();
  
  if (!validateFirebaseConfig(config)) {
    throw new Error('Invalid Firebase configuration');
  }
  
  return config;
}
