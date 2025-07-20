/**
 * Script to set super admin password to 'faraz123'
 * This uses Firebase Admin SDK to directly update the user
 */

// For Node.js environment
const admin = require('firebase-admin');

// Initialize with project ID (no service account needed for some operations)
admin.initializeApp({
  projectId: 'grp-study'
});

async function setSuperAdminPassword() {
  const email = '160422747039@mjcollege.ac.in';
  const newPassword = 'faraz123';
  
  try {
    console.log('🔧 Setting up super admin account...');
    console.log('📧 Email:', email);
    console.log('🔒 Password:', newPassword);
    
    let userRecord;
    
    // Try to find existing user
    try {
      userRecord = await admin.auth().getUserByEmail(email);
      console.log('✅ Found existing user:', userRecord.uid);
      
      // Update password
      await admin.auth().updateUser(userRecord.uid, {
        password: newPassword,
        emailVerified: true
      });
      
      console.log('🔑 Password updated successfully!');
      
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log('👤 User not found, creating new account...');
        
        // Create new user
        userRecord = await admin.auth().createUser({
          email: email,
          password: newPassword,
          emailVerified: true,
          displayName: 'Super Admin'
        });
        
        console.log('✅ Created new user:', userRecord.uid);
      } else {
        throw error;
      }
    }
    
    // Set super admin custom claims
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      super_admin: true
    });
    
    console.log('🔐 Super admin claims set successfully!');
    
    // Verify the setup
    const updatedUser = await admin.auth().getUser(userRecord.uid);
    const customClaims = updatedUser.customClaims || {};
    
    console.log('\n✅ SETUP COMPLETE!');
    console.log('📧 Email:', email);
    console.log('🔒 Password:', newPassword);
    console.log('🔐 Super Admin:', customClaims.super_admin === true);
    console.log('👤 User ID:', userRecord.uid);
    
    return {
      success: true,
      email: email,
      password: newPassword,
      uid: userRecord.uid,
      isSuperAdmin: customClaims.super_admin === true
    };
    
  } catch (error) {
    console.error('❌ Error setting up super admin:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the script
if (require.main === module) {
  setSuperAdminPassword()
    .then(result => {
      if (result.success) {
        console.log('\n🎉 You can now login with:');
        console.log('📧 Email: 160422747039@mjcollege.ac.in');
        console.log('🔒 Password: faraz123');
        console.log('\nUse the test-super-admin.html tool to verify the setup!');
      }
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { setSuperAdminPassword };
