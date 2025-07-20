/**
 * Firebase Console Script for Super Admin Setup
 * Run this in the Firebase Console to set up super admin claims
 * 
 * Instructions:
 * 1. Go to Firebase Console → Project Settings → Service Accounts
 * 2. Click "Generate new private key" and download the JSON file
 * 3. Install Firebase Admin SDK: npm install firebase-admin
 * 4. Run this script with: node firebase-console-setup.js
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin with service account
// Replace this with your actual service account key path
const serviceAccount = require('./path-to-your-service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'grp-study'
});

async function setupSuperAdmin() {
  try {
    const email = '160422747039@mjcollege.ac.in';
    console.log(`🔧 Setting up Super Admin for: ${email}`);

    // Option 1: Find existing user and set claims
    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      console.log(`✅ Found existing user: ${userRecord.uid}`);
      
      // Set custom claims
      await admin.auth().setCustomUserClaims(userRecord.uid, {
        super_admin: true
      });
      
      console.log(`🔐 Super Admin custom claim set for user: ${userRecord.uid}`);
      
      // Optionally update password
      const newPassword = 'SuperAdmin2024!'; // Change this to your desired password
      await admin.auth().updateUser(userRecord.uid, {
        password: newPassword
      });
      
      console.log(`🔑 Password updated for user: ${userRecord.uid}`);
      console.log(`📧 Email: ${email}`);
      console.log(`🔒 New Password: ${newPassword}`);
      
      return {
        success: true,
        uid: userRecord.uid,
        email: email,
        newPassword: newPassword
      };
      
    } catch (userError) {
      if (userError.code === 'auth/user-not-found') {
        console.log(`👤 User not found, creating new user...`);
        
        // Option 2: Create new user with super admin claims
        const newPassword = 'SuperAdmin2024!'; // Change this to your desired password
        const userRecord = await admin.auth().createUser({
          email: email,
          password: newPassword,
          emailVerified: true,
          displayName: 'Super Admin'
        });
        
        console.log(`✅ Created new user: ${userRecord.uid}`);
        
        // Set custom claims
        await admin.auth().setCustomUserClaims(userRecord.uid, {
          super_admin: true
        });
        
        console.log(`🔐 Super Admin custom claim set for new user: ${userRecord.uid}`);
        console.log(`📧 Email: ${email}`);
        console.log(`🔒 Password: ${newPassword}`);
        
        return {
          success: true,
          uid: userRecord.uid,
          email: email,
          newPassword: newPassword,
          created: true
        };
      } else {
        throw userError;
      }
    }
    
  } catch (error) {
    console.error('❌ Error setting up Super Admin:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Alternative function to just set claims for existing user by UID
async function setClaimsForUser(uid) {
  try {
    await admin.auth().setCustomUserClaims(uid, {
      super_admin: true
    });
    
    console.log(`🔐 Super Admin custom claim set for UID: ${uid}`);
    return { success: true, uid };
  } catch (error) {
    console.error('❌ Error setting claims:', error);
    return { success: false, error: error.message };
  }
}

// Alternative function to reset password for existing user
async function resetPasswordForUser(email, newPassword) {
  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    
    await admin.auth().updateUser(userRecord.uid, {
      password: newPassword
    });
    
    console.log(`🔑 Password updated for user: ${userRecord.uid}`);
    console.log(`📧 Email: ${email}`);
    console.log(`🔒 New Password: ${newPassword}`);
    
    return { 
      success: true, 
      uid: userRecord.uid, 
      email: email, 
      newPassword: newPassword 
    };
  } catch (error) {
    console.error('❌ Error resetting password:', error);
    return { success: false, error: error.message };
  }
}

// Run the setup
if (require.main === module) {
  setupSuperAdmin()
    .then(result => {
      console.log('\n🎉 Setup Result:', result);
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Setup Failed:', error);
      process.exit(1);
    });
}

module.exports = {
  setupSuperAdmin,
  setClaimsForUser,
  resetPasswordForUser
};
