"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSuperAdminAnalytics = exports.deleteCommunityRecursively = exports.setupSuperAdmin = void 0;
const functions = require("firebase-functions");
const admin = require("firebase-admin");
// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();
const storage = admin.storage();
/**
 * One-time setup function to assign Super Admin custom claim
 * This function should be called once to set up the Super Admin account
 * After setup, this function can be removed or disabled
 */
exports.setupSuperAdmin = functions.https.onCall(async (data, context) => {
    // This is a one-time setup function - add additional security if needed
    // For production, you might want to add IP restrictions or other security measures
    const { email, setupKey } = data;
    // Simple setup key verification (change this to something secure)
    if (setupKey !== 'SETUP_SUPER_ADMIN_2024') {
        throw new functions.https.HttpsError('permission-denied', 'Invalid setup key');
    }
    if (!email || email !== '160422747039@mjcollege.ac.in') {
        throw new functions.https.HttpsError('invalid-argument', 'Invalid email for Super Admin setup');
    }
    try {
        console.log(`🔧 Setting up Super Admin for email: ${email}`);
        // Get user by email
        let userRecord;
        try {
            userRecord = await admin.auth().getUserByEmail(email);
            console.log(`✅ Found existing user: ${userRecord.uid}`);
        }
        catch (error) {
            // User doesn't exist, create them
            console.log(`👤 Creating new user for email: ${email}`);
            userRecord = await admin.auth().createUser({
                email: email,
                emailVerified: true,
                displayName: 'Super Admin',
                password: 'TempPassword123!' // User should change this immediately
            });
            console.log(`✅ Created new user: ${userRecord.uid}`);
        }
        // Set custom claims
        await admin.auth().setCustomUserClaims(userRecord.uid, {
            super_admin: true
        });
        console.log(`🔐 Super Admin custom claim set for user: ${userRecord.uid}`);
        return {
            success: true,
            message: `Super Admin setup completed for ${email}`,
            uid: userRecord.uid,
            setupAt: admin.firestore.FieldValue.serverTimestamp()
        };
    }
    catch (error) {
        console.error(`❌ Failed to setup Super Admin:`, error);
        throw new functions.https.HttpsError('internal', `Failed to setup Super Admin: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});
/**
 * Recursively delete a community and all its associated data
 * Only callable by Super Admin users
 */
exports.deleteCommunityRecursively = functions.https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    // Verify Super Admin custom claim
    const token = context.auth.token;
    if (!token.super_admin) {
        throw new functions.https.HttpsError('permission-denied', 'Only Super Admin can delete communities');
    }
    const { communityId } = data;
    if (!communityId || typeof communityId !== 'string') {
        throw new functions.https.HttpsError('invalid-argument', 'Community ID is required');
    }
    try {
        console.log(`🗑️ Starting recursive deletion of community: ${communityId}`);
        // Start a batch for atomic operations
        const batch = db.batch();
        // 1. Delete main community document
        const communityRef = db.collection('communities').doc(communityId);
        batch.delete(communityRef);
        // 2. Delete community members
        const membersSnapshot = await db
            .collection('communities')
            .doc(communityId)
            .collection('members')
            .get();
        membersSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        // 3. Delete community roles
        const rolesSnapshot = await db
            .collection('communities')
            .doc(communityId)
            .collection('roles')
            .get();
        rolesSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        // 4. Delete chat channels and messages
        const channelsSnapshot = await db
            .collection('communities')
            .doc(communityId)
            .collection('channels')
            .get();
        for (const channelDoc of channelsSnapshot.docs) {
            // Delete messages in this channel
            const messagesSnapshot = await channelDoc.ref
                .collection('messages')
                .get();
            messagesSnapshot.docs.forEach(messageDoc => {
                batch.delete(messageDoc.ref);
            });
            // Delete the channel
            batch.delete(channelDoc.ref);
        }
        // 5. Delete resources
        const resourcesSnapshot = await db
            .collection('communities')
            .doc(communityId)
            .collection('resources')
            .get();
        resourcesSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        // 6. Delete events
        const eventsSnapshot = await db
            .collection('communities')
            .doc(communityId)
            .collection('events')
            .get();
        eventsSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        // 7. Delete announcements
        const announcementsSnapshot = await db
            .collection('communities')
            .doc(communityId)
            .collection('announcements')
            .get();
        announcementsSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        // 8. Delete join requests
        const joinRequestsSnapshot = await db
            .collection('joinRequests')
            .where('communityId', '==', communityId)
            .get();
        joinRequestsSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        // Commit all Firestore deletions
        await batch.commit();
        console.log(`✅ Firestore documents deleted for community: ${communityId}`);
        // 9. Delete files from Storage
        try {
            const bucket = storage.bucket();
            const [files] = await bucket.getFiles({
                prefix: `resources/${communityId}/`
            });
            if (files.length > 0) {
                console.log(`🗂️ Deleting ${files.length} files from Storage`);
                await Promise.all(files.map(file => file.delete()));
                console.log(`✅ Storage files deleted for community: ${communityId}`);
            }
            else {
                console.log(`📁 No storage files found for community: ${communityId}`);
            }
        }
        catch (storageError) {
            console.warn(`⚠️ Storage deletion failed for community ${communityId}:`, storageError);
            // Don't throw error - Firestore deletion was successful
        }
        console.log(`🎉 Community ${communityId} successfully deleted`);
        return {
            success: true,
            message: `Community ${communityId} and all associated data have been deleted`,
            deletedAt: admin.firestore.FieldValue.serverTimestamp()
        };
    }
    catch (error) {
        console.error(`❌ Failed to delete community ${communityId}:`, error);
        throw new functions.https.HttpsError('internal', `Failed to delete community: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});
/**
 * Get analytics data for Super Admin dashboard
 * Only callable by Super Admin users
 */
exports.getSuperAdminAnalytics = functions.https.onCall(async (data, context) => {
    // Verify authentication
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }
    // Verify Super Admin custom claim
    const token = context.auth.token;
    if (!token.super_admin) {
        throw new functions.https.HttpsError('permission-denied', 'Only Super Admin can access analytics');
    }
    try {
        console.log('📊 Generating Super Admin analytics');
        // Get total users count
        const usersSnapshot = await db.collection('users').get();
        const totalUsers = usersSnapshot.size;
        // Get total communities count
        const communitiesSnapshot = await db.collection('communities').get();
        const totalCommunities = communitiesSnapshot.size;
        // Get communities created this week
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const recentCommunitiesSnapshot = await db
            .collection('communities')
            .where('createdAt', '>=', oneWeekAgo)
            .get();
        const communitiesCreatedThisWeek = recentCommunitiesSnapshot.size;
        // Get flagged communities (if you have a flagged field)
        const flaggedCommunitiesSnapshot = await db
            .collection('communities')
            .where('flagged', '==', true)
            .get();
        const flaggedCommunities = flaggedCommunitiesSnapshot.size;
        // Calculate storage usage (approximate)
        let storageUsage = 0;
        try {
            const bucket = storage.bucket();
            const [files] = await bucket.getFiles({ prefix: 'resources/' });
            storageUsage = files.reduce((total, file) => {
                return total + (file.metadata.size ? parseInt(file.metadata.size) : 0);
            }, 0) / (1024 * 1024); // Convert to MB
        }
        catch (storageError) {
            console.warn('⚠️ Could not calculate storage usage:', storageError);
        }
        // Get top active communities
        const topActiveCommunities = communitiesSnapshot.docs
            .map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name || 'Unknown',
                memberCount: data.memberCount || 0,
                messageCount: data.messageCount || 0,
                resourceCount: data.resourceCount || 0
            };
        })
            .sort((a, b) => (b.memberCount + b.messageCount + b.resourceCount) - (a.memberCount + a.messageCount + a.resourceCount))
            .slice(0, 5);
        const analytics = {
            totalUsers,
            totalCommunities,
            communitiesCreatedThisWeek,
            flaggedCommunities,
            storageUsage,
            topActiveCommunities,
            generatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        console.log('✅ Analytics generated successfully');
        return analytics;
    }
    catch (error) {
        console.error('❌ Failed to generate analytics:', error);
        throw new functions.https.HttpsError('internal', `Failed to generate analytics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
});
//# sourceMappingURL=index.js.map