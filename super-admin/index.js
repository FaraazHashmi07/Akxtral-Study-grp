const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp();

// Function to set up super admin (run once)
exports.setupSuperAdmin = functions.https.onCall(async (data, context) => {
  const { email, setupKey, password } = data;
  const targetEmail = email || '160422747039@mjcollege.ac.in';
  const targetPassword = password || 'faraz123';

  console.log('🔧 Setup request received:', { targetEmail, hasPassword: !!password, setupKey });

  // Allow setup for the specific super admin email
  if (targetEmail !== '160422747039@mjcollege.ac.in') {
    throw new functions.https.HttpsError('permission-denied', 'Invalid email for super admin setup');
  }

  try {
    console.log(`Setting up super admin for email: ${targetEmail} with password: ${targetPassword}`);

    let user;

    try {
      // Try to find existing user
      user = await admin.auth().getUserByEmail(targetEmail);
      console.log(`Found existing user: ${user.uid}`);

      // Update password
      await admin.auth().updateUser(user.uid, {
        password: targetPassword,
        emailVerified: true
      });
      console.log(`Password updated for user: ${user.uid}`);

    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log(`User not found, creating new user...`);

        // Create new user
        user = await admin.auth().createUser({
          email: targetEmail,
          password: targetPassword,
          emailVerified: true,
          displayName: 'Super Admin'
        });
        console.log(`Created new user: ${user.uid}`);
      } else {
        throw error;
      }
    }

    // Assign the super_admin custom claim
    await admin.auth().setCustomUserClaims(user.uid, {
      super_admin: true
    });

    console.log(`✅ Super admin claim assigned to ${targetEmail}`);

    return {
      success: true,
      message: 'Super admin setup completed successfully!',
      email: targetEmail,
      password: targetPassword,
      userId: user.uid
    };

  } catch (error) {
    console.error('❌ Error setting up super admin:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Simple function to set password to faraz123 (no parameters needed)
exports.setPasswordFaraz123 = functions.https.onCall(async (data, context) => {
  const targetEmail = '160422747039@mjcollege.ac.in';
  const targetPassword = 'faraz123';

  try {
    console.log(`🔑 Setting password to faraz123 for: ${targetEmail}`);

    let user;

    try {
      // Try to find existing user
      user = await admin.auth().getUserByEmail(targetEmail);
      console.log(`Found existing user: ${user.uid}`);

      // Update password
      await admin.auth().updateUser(user.uid, {
        password: targetPassword,
        emailVerified: true
      });
      console.log(`Password updated for user: ${user.uid}`);

    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log(`User not found, creating new user...`);

        // Create new user
        user = await admin.auth().createUser({
          email: targetEmail,
          password: targetPassword,
          emailVerified: true,
          displayName: 'Super Admin'
        });
        console.log(`Created new user: ${user.uid}`);
      } else {
        throw error;
      }
    }

    // Assign the super_admin custom claim
    await admin.auth().setCustomUserClaims(user.uid, {
      super_admin: true
    });

    console.log(`✅ Super admin setup complete for ${targetEmail} with password faraz123`);

    return {
      success: true,
      message: 'Super admin setup completed with password faraz123!',
      email: targetEmail,
      password: targetPassword,
      userId: user.uid
    };

  } catch (error) {
    console.error('❌ Error setting up super admin:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Function to check if current user is super admin
exports.checkSuperAdmin = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be signed in');
  }

  const customClaims = context.auth.token;

  return {
    userId: context.auth.uid,
    email: context.auth.token.email,
    isSuperAdmin: customClaims.super_admin === true,
    allClaims: customClaims
  };
});

// Get analytics data for Super Admin dashboard
exports.getSuperAdminAnalytics = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  // Verify Super Admin custom claim
  const token = context.auth.token;
  if (!token.super_admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only Super Admin can access analytics'
    );
  }

  try {
    console.log('📊 [ANALYTICS] Loading Super Admin analytics...');

    const db = admin.firestore();
    const storage = admin.storage();

    // Get total communities
    const communitiesSnapshot = await db.collection('communities').get();
    const totalCommunities = communitiesSnapshot.size;

    // Get communities created this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const recentCommunitiesSnapshot = await db.collection('communities')
      .where('createdAt', '>=', oneWeekAgo)
      .get();
    const communitiesCreatedThisWeek = recentCommunitiesSnapshot.size;

    // Get flagged communities
    const flaggedCommunitiesSnapshot = await db.collection('communities')
      .where('flagged', '==', true)
      .get();
    const flaggedCommunities = flaggedCommunitiesSnapshot.size;

    // Get total users from Firebase Auth
    let totalUsers = 0;
    try {
      const listUsersResult = await admin.auth().listUsers();
      totalUsers = listUsersResult.users.length;
    } catch (error) {
      console.warn('Could not fetch user count from Auth:', error);
      // Fallback: count users from Firestore if Auth fails
      const usersSnapshot = await db.collection('users').get();
      totalUsers = usersSnapshot.size;
    }

    // Calculate storage usage
    let storageUsage = 0;
    try {
      const bucket = storage.bucket();
      const [files] = await bucket.getFiles();
      storageUsage = files.reduce((total, file) => {
        return total + (file.metadata.size ? parseInt(file.metadata.size) : 0);
      }, 0);
      // Convert to MB
      storageUsage = Math.round(storageUsage / (1024 * 1024));
    } catch (error) {
      console.warn('Could not calculate storage usage:', error);
    }

    // Get top active communities
    const topActiveCommunities = await Promise.all(
      communitiesSnapshot.docs.map(async (doc) => {
        const communityData = doc.data();
        const communityId = doc.id;

        // Count members
        const membersSnapshot = await db.collection('communities')
          .doc(communityId)
          .collection('roles')
          .get();
        const memberCount = membersSnapshot.size;

        // Count messages
        const messagesSnapshot = await db.collection('communities')
          .doc(communityId)
          .collection('messages')
          .get();
        const messageCount = messagesSnapshot.size;

        // Count resources
        const resourcesSnapshot = await db.collection('communities')
          .doc(communityId)
          .collection('resources')
          .get();
        const resourceCount = resourcesSnapshot.size;

        return {
          id: communityId,
          name: communityData.name || 'Unknown Community',
          memberCount,
          messageCount,
          resourceCount
        };
      })
    )
    .then(communities =>
      communities
        .sort((a, b) => (b.memberCount + b.messageCount + b.resourceCount) - (a.memberCount + a.messageCount + a.resourceCount))
        .slice(0, 5)
    );

    const analytics = {
      totalUsers,
      totalCommunities,
      communitiesCreatedThisWeek,
      flaggedCommunities,
      storageUsage,
      topActiveCommunities
    };

    console.log('✅ [ANALYTICS] Analytics loaded successfully:', analytics);
    return analytics;

  } catch (error) {
    console.error('❌ [ANALYTICS] Error loading analytics:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

// Delete community and all its data recursively
exports.deleteCommunityRecursively = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
  }

  // Verify Super Admin custom claim
  const token = context.auth.token;
  if (!token.super_admin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only Super Admin can delete communities'
    );
  }

  const { communityId } = data;

  if (!communityId) {
    throw new functions.https.HttpsError('invalid-argument', 'Community ID is required');
  }

  try {
    console.log(`🗑️ [DELETE] Starting deletion of community: ${communityId}`);

    const db = admin.firestore();
    const storage = admin.storage();
    const bucket = storage.bucket();

    // Delete all subcollections
    const subcollections = ['messages', 'resources', 'events', 'roles'];

    for (const subcollection of subcollections) {
      console.log(`🗑️ [DELETE] Deleting ${subcollection} subcollection...`);
      const subcollectionRef = db.collection('communities').doc(communityId).collection(subcollection);

      // Get all documents in batches
      let query = subcollectionRef.limit(500);
      let snapshot = await query.get();

      while (!snapshot.empty) {
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();

        // Get next batch
        snapshot = await query.get();
      }
    }

    // Delete storage files for this community
    try {
      console.log(`🗑️ [DELETE] Deleting storage files...`);
      const [files] = await bucket.getFiles({
        prefix: `resources/${communityId}/`
      });

      if (files.length > 0) {
        await Promise.all(files.map(file => file.delete()));
        console.log(`🗑️ [DELETE] Deleted ${files.length} storage files`);
      }
    } catch (storageError) {
      console.warn('⚠️ [DELETE] Error deleting storage files:', storageError);
      // Continue with deletion even if storage cleanup fails
    }

    // Finally, delete the community document itself
    console.log(`🗑️ [DELETE] Deleting community document...`);
    await db.collection('communities').doc(communityId).delete();

    console.log(`✅ [DELETE] Successfully deleted community: ${communityId}`);

    return {
      success: true,
      message: 'Community deleted successfully',
      communityId
    };

  } catch (error) {
    console.error(`❌ [DELETE] Error deleting community ${communityId}:`, error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});
