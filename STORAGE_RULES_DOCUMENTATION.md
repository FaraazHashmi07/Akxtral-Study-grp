# Firebase Storage Rules Documentation

## Overview

This document explains the Firebase Storage security rules implemented for the Akxtral Study Group application. The rules provide secure access control for file uploads and downloads across different areas of the application.

## Storage Structure

The application uses the following storage structure:

```
/avatars/{uid}/{fileName}                                    - User profile avatars
/communities/{communityId}/icon/{fileName}                   - Community icons/logos
/communities/{communityId}/images/{fileName}                 - Community banners and images
/communities/{communityId}/resources/{resourceId}/{fileName} - Community shared resources
/temp/{uid}/{fileName}                                       - Temporary uploads
/chat/{communityId}/attachments/{messageId}/{fileName}      - Chat attachments
/resources/{communityId}/{allPaths}                         - Super admin access path
```

## Security Rules Summary

### Helper Functions

- **`isAuthenticated()`**: Checks if user is logged in
- **`isSuperAdmin()`**: Checks if user has super admin privileges
- **`isOwner(uid)`**: Checks if current user owns the resource
- **`isValidImageFile()`**: Validates image files (2MB limit, image/* MIME types)
- **`isValidDocumentFile()`**: Validates document files (10MB limit, specific MIME types)
- **`isValidAvatarFile()`**: Validates avatar images (2MB limit, specific image formats)
- **`isValidCommunityIconFile()`**: Validates community icons (2MB limit, icon formats)
- **`isCommunityMember()`**: Simplified check for community membership
- **`isCommunityAdmin()`**: Simplified check for community admin privileges

### File Type Restrictions

#### Allowed Image Types
- JPEG, PNG, GIF, WebP, SVG (for icons)
- Maximum size: 2MB

#### Allowed Document Types
- PDF, Word documents (DOC, DOCX)
- PowerPoint presentations (PPT, PPTX)
- Excel spreadsheets (XLS, XLSX)
- Text files (TXT, RTF)
- Archives (ZIP, RAR)
- Maximum size: 10MB

### Access Control Rules

#### User Avatars (`/avatars/{uid}/{fileName}`)
- **Read**: Public access (avatars are publicly viewable)
- **Write**: Owner only, must be authenticated, valid avatar file
- **Delete**: Owner or super admin

#### Community Icons (`/communities/{communityId}/icon/{fileName}`)
- **Read**: Public access
- **Write**: Community admins only, valid icon file
- **Delete**: Community admins or super admin

#### Community Resources (`/communities/{communityId}/resources/{resourceId}/{fileName}`)
- **Read**: Community members only
- **Write**: Community members only, valid file types
- **Delete**: File owner, community admins, or super admin

#### Community Images (`/communities/{communityId}/images/{fileName}`)
- **Read**: Public access
- **Write**: Community admins only, valid image files
- **Delete**: Community admins or super admin

#### Temporary Uploads (`/temp/{uid}/{fileName}`)
- **Read/Write**: Owner only, valid file types
- **Delete**: Owner or super admin
- **Note**: These should be cleaned up automatically after processing

#### Chat Attachments (`/chat/{communityId}/attachments/{messageId}/{fileName}`)
- **Read**: Community members only
- **Write**: Community members only, valid file types
- **Delete**: File owner, community admins, or super admin

#### Super Admin Access (`/resources/{communityId}/{allPaths}`)
- **Read/Write/Delete**: Super admins only (for management purposes)

## Security Features

1. **Authentication Required**: Most operations require user authentication
2. **File Type Validation**: Strict MIME type and extension checking
3. **File Size Limits**: 2MB for images, 10MB for documents
4. **Ownership Validation**: Users can only modify their own files (with admin exceptions)
5. **Role-Based Access**: Different permissions for regular users, community admins, and super admins
6. **Public vs Private**: Strategic public access for avatars and community images
7. **Metadata Tracking**: Uses metadata to track file ownership

## Deployment

The storage rules are configured in `firebase.json` and deployed using:

```bash
firebase deploy --only storage
```

## Future Improvements

The current implementation uses simplified permission checks. Future enhancements could include:

1. **Custom Claims**: Implement proper community membership and admin role validation
2. **Resource Metadata**: Use custom metadata for more granular permission checking
3. **Quota Management**: Implement per-user or per-community storage quotas
4. **Automatic Cleanup**: Implement rules for automatic deletion of temporary files
5. **Content Scanning**: Add virus scanning and content moderation

## Testing

To test the storage rules:

1. Use Firebase Storage emulator for local testing
2. Test different user roles and permissions
3. Verify file type and size restrictions
4. Test public vs private access patterns

## Monitoring

Monitor storage usage and security through:

1. Firebase Console Storage section
2. Cloud Logging for rule violations
3. Usage metrics and quotas
4. Security alerts for suspicious activity