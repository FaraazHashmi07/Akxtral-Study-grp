import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, X, File, Image, FileText, Plus, Tag, AlertCircle, CheckCircle } from 'lucide-react';
import { BaseModal } from '../UI/ModalContainer';
import { useUIStore } from '../../store/uiStore';
import { useResourceStore } from '../../store/resourceStore';
import { useCommunityStore } from '../../store/communityStore';
import { useAuthStore } from '../../store/authStore';
import { validateFile, ALLOWED_FILE_TYPES } from '../../services/storageService';
import { canUploadResources } from '../../lib/authorization';

interface UploadResourceModalProps {
  communityId: string;
}

export const UploadResourceModal: React.FC<UploadResourceModalProps> = ({ communityId }) => {
  const { closeModal, showToast } = useUIStore();
  const { uploadResource, loadResources, loading } = useResourceStore();
  const { activeCommunity } = useCommunityStore();
  const { user } = useAuthStore();

  // Check permissions - more permissive for community members
  const isAuthenticated = !!user;
  const canUpload = user && canUploadResources(user, communityId);
  const uploadsAllowed = activeCommunity?.settings?.allowFileUploads !== false;

  // Allow upload if user is authenticated and uploads are enabled
  // We'll do more detailed permission checking in the upload process
  const allowUpload = isAuthenticated && uploadsAllowed;

  // Removed console.log to prevent excessive logging
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    tags: [] as string[]
  });
  const [newTag, setNewTag] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = useCallback((file: File) => {
    const validation = validateFile(file);
    if (!validation.isValid) {
      showToast({
        type: 'error',
        title: 'Invalid File',
        message: validation.error || 'File validation failed'
      });
      return;
    }

    setSelectedFile(file);
    setFormData(prev => ({
      ...prev,
      name: prev.name || file.name.replace(/\.[^/.]+$/, '') // Remove extension for display
    }));
  }, [showToast]);

  // Handle drag and drop
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  }, [handleFileSelect]);

  // Handle file input change
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0]);
    }
  };

  // Handle form input changes
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Add tag
  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  // Remove tag
  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile) {
      showToast({
        type: 'error',
        title: 'No File Selected',
        message: 'Please select a file to upload'
      });
      return;
    }

    if (!formData.name.trim()) {
      showToast({
        type: 'error',
        title: 'Name Required',
        message: 'Please provide a name for the resource'
      });
      return;
    }

    if (!user) {
      showToast({
        type: 'error',
        title: 'Authentication Required',
        message: 'You must be logged in to upload files'
      });
      return;
    }

    setIsUploading(true);
    try {
      const uploadedResource = await uploadResource(
        communityId, 
        selectedFile, 
        {
          name: formData.name.trim(),
          description: formData.description.trim(),
          tags: formData.tags
        },
        (progress) => {
          setUploadProgress(progress.percentage);
        }
      );

      showToast({
        type: 'success',
        title: 'Upload Successful',
        message: `${formData.name} has been uploaded successfully`
      });

      // Refresh resources to ensure immediate display
      try {
        await loadResources(communityId);
      } catch (refreshError) {
        console.warn('Failed to refresh resources after upload:', refreshError);
      }

      // Reset form
      setSelectedFile(null);
      setFormData({
        name: '',
        description: '',
        tags: []
      });

      closeModal();
    } catch (error) {
      console.error('Upload failed:', error);

      let errorMessage = 'Failed to upload file';
      let errorTitle = 'Upload Failed';

      if (error instanceof Error) {
        errorMessage = error.message;

        // Customize error titles based on error type
        if (error.message.includes('permission')) {
          errorTitle = 'Permission Denied';
        } else if (error.message.includes('size')) {
          errorTitle = 'File Too Large';
        } else if (error.message.includes('type') || error.message.includes('format')) {
          errorTitle = 'Invalid File Type';
        } else if (error.message.includes('network') || error.message.includes('connection')) {
          errorTitle = 'Network Error';
        }
      }

      showToast({
        type: 'error',
        title: errorTitle,
        message: errorMessage
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Get file icon based on type
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image size={24} className="text-blue-500" />;
    if (file.type.includes('pdf')) return <FileText size={24} className="text-red-500" />;
    return <File size={24} className="text-gray-500" />;
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Show permission error if user can't upload
  if (!allowUpload) {
    return (
      <BaseModal title="Upload Resource" size="lg">
        <div className="text-center py-8">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Upload Not Allowed
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {!isAuthenticated
              ? "You must be logged in to upload files."
              : "File uploads are disabled for this community."
            }
          </p>
          <button
            onClick={closeModal}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </BaseModal>
    );
  }

  return (
    <BaseModal title="Upload Resource" size="lg">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Upload Area */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Select File
          </label>
          
          {!selectedFile ? (
            <div
              className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Drop your file here, or{' '}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-600 hover:text-blue-700 underline"
                >
                  browse
                </button>
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Supported formats: {Object.keys(ALLOWED_FILE_TYPES).join(', ')}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Maximum file size: 10MB for documents, 2MB for images
              </p>
              
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileInputChange}
                accept={Object.values(ALLOWED_FILE_TYPES).join(',')}
                className="hidden"
              />
            </div>
          ) : (
            <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                {getFileIcon(selectedFile)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X size={16} />
                </button>
              </div>
              
              {/* Upload Progress */}
              {isUploading && (
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                    <span>Uploading...</span>
                    <span>{Math.round(uploadProgress)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Resource Details */}
        {selectedFile && (
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Resource Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter resource name"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                placeholder="Describe this resource (optional)"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Tags
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                  >
                    <Tag size={12} className="mr-1" />
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Add a tag"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  disabled={!newTag.trim()}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={closeModal}
            disabled={isUploading}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!selectedFile || !formData.name.trim() || isUploading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isUploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload size={16} />
                <span>Upload Resource</span>
              </>
            )}
          </button>
        </div>
      </form>
    </BaseModal>
  );
};
