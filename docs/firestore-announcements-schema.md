# Firestore Announcements Schema

## Collection Structure

### `/communities/{communityId}/announcements/{announcementId}`

```typescript
interface Announcement {
  id: string;                    // Auto-generated document ID
  communityId: string;           // Reference to parent community
  title: string;                 // Announcement title
  content: string;               // Announcement content (supports markdown)
  authorId: string;              // UID of the admin who created it
  authorName: string;            // Display name of author
  authorAvatar?: string;         // Author's profile picture URL
  isPinned: boolean;             // Whether announcement is pinned to top
  isImportant: boolean;          // Whether announcement is marked as important
  attachments?: {                // Optional file attachments
    id: string;
    name: string;
    url: string;
    type: string;
    size: number;
  }[];
  reactions?: MessageReaction[]; // Emoji reactions (reuse existing structure)
  createdAt: Timestamp;          // When announcement was created
  updatedAt?: Timestamp;         // When announcement was last edited
}
```

### `/communities/{communityId}/announcementReads/{userId}`

```typescript
interface AnnouncementReads {
  userId: string;                           // User who read announcements
  communityId: string;                      // Community context
  lastReadTimestamp: Timestamp;             // Last time user opened announcements tab
  readAnnouncementIds: string[];            // Array of announcement IDs user has seen
  updatedAt: Timestamp;                     // When read status was last updated
}
```

## Firestore Security Rules

```javascript
// Announcements collection rules
match /communities/{communityId}/announcements/{announcementId} {
  // Allow read for all community members
  allow read: if isAuthenticated() && isCommunityMember(communityId);
  
  // Allow create/update/delete only for community admins
  allow create, update, delete: if isAuthenticated() && 
    isCommunityAdmin(communityId) && 
    request.auth.uid == resource.data.authorId;
}

// Announcement reads collection rules
match /communities/{communityId}/announcementReads/{userId} {
  // Users can only read/write their own read status
  allow read, write: if isAuthenticated() && 
    request.auth.uid == userId && 
    isCommunityMember(communityId);
}
```

## Firestore Indexes

### Composite Indexes Required:

1. **Announcements by Community (with ordering)**
   - Collection: `communities/{communityId}/announcements`
   - Fields: `communityId` (Ascending), `isPinned` (Descending), `createdAt` (Descending)
   - Purpose: Fetch announcements with pinned ones first, then by newest

2. **Announcements by Author**
   - Collection: `communities/{communityId}/announcements`
   - Fields: `communityId` (Ascending), `authorId` (Ascending), `createdAt` (Descending)
   - Purpose: Admin management of their own announcements

3. **Important Announcements**
   - Collection: `communities/{communityId}/announcements`
   - Fields: `communityId` (Ascending), `isImportant` (Ascending), `createdAt` (Descending)
   - Purpose: Filter important announcements

## Data Flow

### Creating Announcements:
1. Admin clicks "New Announcement" button
2. Modal opens with form (title, content, pinned toggle, attachments)
3. On submit: Create document in `/communities/{communityId}/announcements`
4. Real-time listeners update all users' announcement lists
5. Unread badges appear for users who haven't seen the new announcement

### Reading Announcements:
1. User clicks "Announcements" tab
2. Load announcements from Firestore (ordered by pinned, then createdAt)
3. Update user's read status in `/communities/{communityId}/announcementReads/{userId}`
4. Clear unread badge for this user

### Unread Badge Logic:
1. Count announcements created after user's `lastReadTimestamp`
2. Exclude announcements in user's `readAnnouncementIds` array
3. Display count as red badge next to "Announcements" tab
4. Reset when user opens announcements section

### Emoji Reactions:
- Reuse existing `MessageReaction` structure from chat system
- Update announcement document's `reactions` array
- Real-time updates for all users viewing announcements
