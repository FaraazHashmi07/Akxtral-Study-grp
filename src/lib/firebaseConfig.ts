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
// NOTE: These are placeholder values. For production use, you need to:
// 1. Go to Firebase Console: https://console.firebase.google.com
// 2. Select your 'grp-study' project
// 3. Go to Project Settings → General → Your apps
// 4. Copy the real configuration values
// 5. Set them as environment variables in Netlify or use them here
const PRODUCTION_CONFIG: FirebaseConfigType = {
  apiKey: "PLACEHOLDER_API_KEY", // Replace with real API key
  authDomain: "grp-study.firebaseapp.com",
  projectId: "grp-study",
  storageBucket: "grp-study.appspot.com",
  messagingSenderId: "PLACEHOLDER_SENDER_ID", // Replace with real sender ID
  appId: "PLACEHOLDER_APP_ID", // Replace with real app ID
  measurementId: "G-PLACEHOLDER" // Replace with real measurement ID
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

  // Check for placeholder values
  const placeholders = [
    'PLACEHOLDER_API_KEY',
    'PLACEHOLDER_SENDER_ID',
    'PLACEHOLDER_APP_ID',
    'demo-api-key',
    'your_api_key_here'
  ];

  const hasPlaceholders = placeholders.some(placeholder =>
    config.apiKey.includes(placeholder) ||
    config.appId.includes(placeholder) ||
    config.messagingSenderId.includes(placeholder)
  );

  if (hasPlaceholders) {
    console.warn('⚠️ Firebase configuration contains placeholder values');
    console.warn('🔧 To enable authentication, configure real Firebase values:');
    console.warn('   1. Go to https://console.firebase.google.com');
    console.warn('   2. Select your grp-study project');
    console.warn('   3. Go to Project Settings → General → Your apps');
    console.warn('   4. Copy the configuration values');
    console.warn('   5. Set as environment variables in Netlify or update firebaseConfig.ts');
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
