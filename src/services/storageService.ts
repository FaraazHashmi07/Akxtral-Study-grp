import { storage, auth } from '../lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject, uploadBytesResumable } from 'firebase/storage';
import { Resource } from '../types';

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  percentage: number;
}

export interface UploadResult {
  downloadURL: string;
  fullPath: string;
  name: string;
  size: number;
  contentType: string;
}

// Allowed file types and their MIME types
export const ALLOWED_FILE_TYPES = {
  // Documents
  'pdf': 'application/pdf',
  'doc': 'application/msword',
  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'txt': 'text/plain',
  'rtf': 'application/rtf',
  
  // Images
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'gif': 'image/gif',
  'webp': 'image/webp',
  
  // Presentations
  'ppt': 'application/vnd.ms-powerpoint',
  'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  
  // Spreadsheets
  'xls': 'application/vnd.ms-excel',
  'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  
  // Archives
  'zip': 'application/zip',
  'rar': 'application/x-rar-compressed'
};

// File size limits (in bytes)
export const FILE_SIZE_LIMITS = {
  image: 2 * 1024 * 1024, // 2MB for images
  document: 10 * 1024 * 1024, // 10MB for documents
  default: 10 * 1024 * 1024 // 10MB default
};

/**
 * Validates if a file is allowed to be uploaded
 */
export const validateFile = (file: File): { isValid: boolean; error?: string } => {
  // Check file extension
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !ALLOWED_FILE_TYPES[extension as keyof typeof ALLOWED_FILE_TYPES]) {
    return {
      isValid: false,
      error: `File type .${extension} is not allowed. Allowed types: ${Object.keys(ALLOWED_FILE_TYPES).join(', ')}`
    };
  }

  // Check MIME type
  const expectedMimeType = ALLOWED_FILE_TYPES[extension as keyof typeof ALLOWED_FILE_TYPES];
  if (file.type && file.type !== expectedMimeType) {
    return {
      isValid: false,
      error: `Invalid file type. Expected ${expectedMimeType} but got ${file.type}`
    };
  }

  // Check file size
  const isImage = file.type.startsWith('image/');
  const sizeLimit = isImage ? FILE_SIZE_LIMITS.image : FILE_SIZE_LIMITS.document;
  
  if (file.size > sizeLimit) {
    const limitMB = sizeLimit / (1024 * 1024);
    return {
      isValid: false,
      error: `File size exceeds ${limitMB}MB limit. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`
    };
  }

  return { isValid: true };
};

/**
 * Generates a unique filename to prevent conflicts
 */
export const generateUniqueFileName = (originalName: string): string => {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 8);
  const extension = originalName.split('.').pop();
  const nameWithoutExtension = originalName.replace(/\.[^/.]+$/, '');
  
  return `${nameWithoutExtension}_${timestamp}_${randomString}.${extension}`;
};

/**
 * Uploads a file to Firebase Storage with progress tracking
 */
export const uploadFileToStorage = async (
  file: File,
  path: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
  if (!auth.currentUser) {
    throw new Error('User must be authenticated to upload files');
  }

  // Validate file
  const validation = validateFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  try {
    // Generate unique filename
    const uniqueFileName = generateUniqueFileName(file.name);
    const fullPath = `${path}/${uniqueFileName}`;
    
    // Create storage reference
    const storageRef = ref(storage, fullPath);
    
    // Upload with progress tracking
    const uploadTask = uploadBytesResumable(storageRef, file);
    
    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Progress tracking
          const progress: UploadProgress = {
            bytesTransferred: snapshot.bytesTransferred,
            totalBytes: snapshot.totalBytes,
            percentage: (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          };
          
          if (onProgress) {
            onProgress(progress);
          }
        },
        (error) => {
          // Handle upload errors
          console.error('Upload failed:', error);
          reject(new Error(`Upload failed: ${error.message}`));
        },
        async () => {
          // Upload completed successfully
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            
            resolve({
              downloadURL,
              fullPath: uploadTask.snapshot.ref.fullPath,
              name: uniqueFileName,
              size: file.size,
              contentType: file.type
            });
          } catch (error) {
            reject(new Error(`Failed to get download URL: ${error}`));
          }
        }
      );
    });
  } catch (error) {
    console.error('Storage upload error:', error);
    throw new Error(`Failed to upload file: ${error}`);
  }
};

/**
 * Uploads a community resource file
 */
export const uploadCommunityResource = async (
  communityId: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
  const resourceId = `resource_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const path = `communities/${communityId}/resources/${resourceId}`;
  
  return uploadFileToStorage(file, path, onProgress);
};

/**
 * Deletes a file from Firebase Storage
 */
export const deleteFileFromStorage = async (filePath: string): Promise<void> => {
  if (!auth.currentUser) {
    throw new Error('User must be authenticated to delete files');
  }

  try {
    const fileRef = ref(storage, filePath);
    await deleteObject(fileRef);
  } catch (error) {
    console.error('Failed to delete file from storage:', error);
    throw new Error(`Failed to delete file: ${error}`);
  }
};

/**
 * Uploads user avatar
 */
export const uploadUserAvatar = async (
  userId: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
  // Validate that it's an image
  if (!file.type.startsWith('image/')) {
    throw new Error('Avatar must be an image file');
  }

  const path = `avatars/${userId}`;
  return uploadFileToStorage(file, path, onProgress);
};

/**
 * Uploads community icon with specific validation and path structure
 */
export const uploadCommunityIcon = async (
  communityId: string,
  file: File,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
  if (!auth.currentUser) {
    throw new Error('User must be authenticated to upload community icon');
  }

  // Validate that it's an image
  if (!file.type.startsWith('image/')) {
    throw new Error('Community icon must be an image file');
  }

  // Validate file type - only allow specific image formats for icons
  const allowedIconTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
  if (!allowedIconTypes.includes(file.type)) {
    throw new Error('Community icon must be PNG, JPG, JPEG, or SVG format');
  }

  // Validate file size - 2MB limit for icons
  const maxSize = 2 * 1024 * 1024; // 2MB
  if (file.size > maxSize) {
    throw new Error(`Icon file size must be less than 2MB. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
  }

  try {
    // Get file extension
    const extension = file.name.split('.').pop()?.toLowerCase() || 'png';

    // Create specific path for community icon
    const iconPath = `communities/${communityId}/icon.${extension}`;

    // Create storage reference
    const storageRef = ref(storage, iconPath);

    // Upload with progress tracking
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Promise((resolve, reject) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // Progress tracking
          const progress: UploadProgress = {
            bytesTransferred: snapshot.bytesTransferred,
            totalBytes: snapshot.totalBytes,
            percentage: Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
          };

          console.log(`📤 [STORAGE] Icon upload progress: ${progress.percentage}%`);
          onProgress?.(progress);
        },
        (error) => {
          console.error('❌ [STORAGE] Icon upload failed:', error);
          reject(new Error(`Failed to upload community icon: ${error.message}`));
        },
        async () => {
          try {
            // Upload completed successfully
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

            const result: UploadResult = {
              downloadURL,
              fullPath: uploadTask.snapshot.ref.fullPath,
              name: file.name,
              size: file.size,
              contentType: file.type
            };

            console.log('✅ [STORAGE] Community icon uploaded successfully:', result);
            resolve(result);
          } catch (urlError) {
            console.error('❌ [STORAGE] Failed to get download URL:', urlError);
            reject(new Error('Failed to get download URL for uploaded icon'));
          }
        }
      );
    });
  } catch (error) {
    console.error('❌ [STORAGE] Community icon upload error:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to upload community icon');
  }
};

/**
 * Uploads community banner or icon (legacy function - use uploadCommunityIcon for icons)
 */
export const uploadCommunityImage = async (
  communityId: string,
  file: File,
  type: 'banner' | 'icon',
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
  // For icons, use the specialized function
  if (type === 'icon') {
    return uploadCommunityIcon(communityId, file, onProgress);
  }

  // Validate that it's an image
  if (!file.type.startsWith('image/')) {
    throw new Error('Community image must be an image file');
  }

  const path = `communities/${communityId}/images`;
  return uploadFileToStorage(file, path, onProgress);
};
