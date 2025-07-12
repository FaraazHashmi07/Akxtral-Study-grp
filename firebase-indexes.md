# Firebase Firestore Indexes Required

## Resources Collection Index

To enable efficient querying of resources by community with proper sorting, you need to create a composite index.

### Required Index Configuration:

**Collection:** `resources`

**Fields:**
1. `communityId` (Ascending)
2. `uploadedAt` (Descending)

### How to Create the Index:

#### Option 1: Automatic Creation (Recommended)
1. Click this link to automatically create the index: 
   [Create Index](https://console.firebase.google.com/v1/r/project/grp-study/firestore/indexes?create_composite=Cktwcm9qZWN0cy9ncnAtc3R1ZHkvZGF0YWJhc2VzLyhkZWZhdWx0KS9jb2xsZWN0aW9uR3JvdXBzL3Jlc291cmNlcy9pbmRleGVzL18QARoPCgtjb21tdW5pdHlJZBABGg4KCnVwbG9hZGVkQXQQAhoMCghfX25hbWVfXhAC)

2. Click "Create Index" in the Firebase Console
3. Wait for the index to build (usually takes a few minutes)

#### Option 2: Manual Creation
1. Go to [Firebase Console](https://console.firebase.google.com/project/grp-study/firestore/indexes)
2. Click "Create Index"
3. Select Collection: `resources`
4. Add fields:
   - Field: `communityId`, Order: `Ascending`
   - Field: `uploadedAt`, Order: `Descending`
5. Click "Create"

### Index Status
Once created, the index will show as "Building" and then "Enabled" when ready.

### Fallback Behavior
The application has been updated to handle missing indexes gracefully:
- If the composite index is available, it will use optimized queries
- If the index is missing, it will fall back to simple queries and sort in JavaScript
- Resources will still load and display correctly in both cases

### Performance Notes
- With the index: Very fast queries, optimal for large datasets
- Without the index: Slightly slower for communities with many resources, but still functional

## Other Recommended Indexes

For optimal performance, you may also want to create these indexes:

### Communities Collection
- `isPublic` (Ascending) + `createdAt` (Descending)
- `category` (Ascending) + `memberCount` (Descending)

### Users Collection  
- `globalRole` (Ascending)
- `emailVerified` (Ascending) + `createdAt` (Descending)

These can be created as needed when you encounter similar index requirement errors.
