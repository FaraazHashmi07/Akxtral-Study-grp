// Test helper for file upload functionality
// This file can be used to test the upload system in development

import { validateFile, ALLOWED_FILE_TYPES } from '../services/storageService';

/**
 * Creates a mock file for testing upload functionality
 */
export const createMockFile = (
  name: string = 'test-document.pdf',
  type: string = 'application/pdf',
  size: number = 1024 * 1024 // 1MB
): File => {
  const content = new Array(size).fill('a').join('');
  const blob = new Blob([content], { type });
  
  // Create a File object
  const file = new File([blob], name, { type });
  
  return file;
};

/**
 * Test file validation with various file types
 */
export const testFileValidation = () => {
  console.log('🧪 Testing file validation...');
  
  // Test valid files
  const validFiles = [
    createMockFile('document.pdf', 'application/pdf', 1024 * 1024),
    createMockFile('image.jpg', 'image/jpeg', 512 * 1024),
    createMockFile('text.txt', 'text/plain', 100 * 1024),
  ];
  
  validFiles.forEach(file => {
    const result = validateFile(file);
    console.log(`✅ ${file.name}: ${result.isValid ? 'Valid' : 'Invalid - ' + result.error}`);
  });
  
  // Test invalid files
  const invalidFiles = [
    createMockFile('large.pdf', 'application/pdf', 15 * 1024 * 1024), // Too large
    createMockFile('script.exe', 'application/x-executable', 1024), // Invalid type
    createMockFile('huge-image.jpg', 'image/jpeg', 5 * 1024 * 1024), // Image too large
  ];
  
  invalidFiles.forEach(file => {
    const result = validateFile(file);
    console.log(`❌ ${file.name}: ${result.isValid ? 'Valid' : 'Invalid - ' + result.error}`);
  });
};

/**
 * Get supported file types for display
 */
export const getSupportedFileTypes = () => {
  return Object.keys(ALLOWED_FILE_TYPES);
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Check if file type is supported
 */
export const isFileTypeSupported = (fileName: string): boolean => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  return extension ? Object.keys(ALLOWED_FILE_TYPES).includes(extension) : false;
};

// Export for console testing
if (typeof window !== 'undefined') {
  (window as any).uploadTestHelper = {
    createMockFile,
    testFileValidation,
    getSupportedFileTypes,
    formatFileSize,
    isFileTypeSupported
  };
}
