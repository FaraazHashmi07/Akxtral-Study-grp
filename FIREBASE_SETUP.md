# Firebase Configuration Setup Guide

## 🔥 Quick Fix for Authentication Issues

If you're seeing "auth/api-key-not-valid" errors, follow these steps to configure Firebase properly:

### Step 1: Get Your Firebase Configuration

1. **Go to Firebase Console**: https://console.firebase.google.com
2. **Select your project**: `grp-study`
3. **Navigate to Project Settings**:
   - Click the gear icon ⚙️ in the left sidebar
   - Select "Project settings"
4. **Find Your App Configuration**:
   - Scroll down to "Your apps" section
   - Click on your web app or the "Config" button
   - Copy the configuration object

Your config should look like this:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...", // Your real API key
  authDomain: "grp-study.firebaseapp.com",
  projectId: "grp-study",
  storageBucket: "grp-study.appspot.com",
  messagingSenderId: "123456789012", // Your real sender ID
  appId: "1:123456789012:web:abcdef123456", // Your real app ID
  measurementId: "G-XXXXXXXXXX" // Your real measurement ID
};
```

### Step 2: Configure for Netlify Deployment

1. **Go to Netlify Dashboard**: https://app.netlify.com
2. **Select your site**: `studygroup22`
3. **Navigate to Environment Variables**:
   - Go to "Site settings" → "Environment variables"
4. **Add these variables**:

```bash
VITE_FIREBASE_API_KEY=your_real_api_key_from_step_1
VITE_FIREBASE_AUTH_DOMAIN=grp-study.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=grp-study
VITE_FIREBASE_STORAGE_BUCKET=grp-study.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_real_sender_id_from_step_1
VITE_FIREBASE_APP_ID=your_real_app_id_from_step_1
VITE_FIREBASE_MEASUREMENT_ID=your_real_measurement_id_from_step_1
```

5. **Trigger New Deployment**:
   - Go to "Deploys" tab
   - Click "Trigger deploy" → "Clear cache and deploy site"

### Step 3: Configure for Local Development

1. **Create `.env.local` file** in your project root:
```bash
# Firebase Configuration for Local Development
VITE_FIREBASE_API_KEY=your_real_api_key_from_step_1
VITE_FIREBASE_AUTH_DOMAIN=grp-study.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=grp-study
VITE_FIREBASE_STORAGE_BUCKET=grp-study.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_real_sender_id_from_step_1
VITE_FIREBASE_APP_ID=your_real_app_id_from_step_1
VITE_FIREBASE_MEASUREMENT_ID=your_real_measurement_id_from_step_1
```

2. **Restart your development server**:
```bash
npm run dev
```

### Step 4: Verify Configuration

After setting up:

1. **Check Console Logs**:
   - Open browser developer tools
   - Look for: "✅ Firebase initialized successfully"
   - Should NOT see: "⚠️ Firebase configuration contains placeholder values"

2. **Test Authentication**:
   - Try Google sign-in
   - Should work without "api-key-not-valid" errors

## 🚨 Alternative: Quick Fix for Demo Mode

If you want to test the app without setting up Firebase:

1. **The app will automatically run in demo mode**
2. **Authentication will be disabled** but the UI will work
3. **You'll see**: "Authentication is in demo mode" messages
4. **All other features** (landing page, theme toggle, etc.) will work perfectly

## 🔧 Troubleshooting

### Common Issues:

1. **"API key not valid" error**:
   - Double-check you copied the correct API key from Firebase Console
   - Ensure no extra spaces or characters in environment variables

2. **"Authentication unavailable" error**:
   - App is running in demo mode
   - Follow steps above to configure real Firebase values

3. **Environment variables not working**:
   - For Netlify: Clear cache and redeploy after adding variables
   - For local: Restart development server after creating .env.local

4. **Still seeing placeholder values**:
   - Check that environment variables are properly set
   - Verify variable names match exactly (including VITE_ prefix)

## ✅ Success Indicators

When properly configured, you should see:
- ✅ "Firebase initialized successfully" in console
- ✅ Google sign-in works without errors
- ✅ No "api-key-not-valid" errors
- ✅ Authentication flows work properly

## 📞 Need Help?

If you're still having issues:
1. Check the browser console for specific error messages
2. Verify your Firebase project is active and properly configured
3. Ensure all required Firebase services are enabled (Auth, Firestore, Storage)
