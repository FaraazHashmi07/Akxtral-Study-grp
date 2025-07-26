import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, X, Image as ImageIcon, Trash2 } from 'lucide-react';
import { BaseModal } from '../UI/ModalContainer';
import { useCommunityStore } from '../../store/communityStore';
import { useUIStore } from '../../store/uiStore';
import { Community } from '../../types';
import { UploadProgress } from '../../services/storageService';
import { createCommunityWithIcon } from '../../services/communityService';
import { useAuthStore } from '../../store/authStore';

export const CreateCommunityModal: React.FC = () => {
  const { createCommunity } = useCommunityStore();
  const { closeModal, showToast } = useUIStore();
  const { user } = useAuthStore();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'other' as Community['category'],
    visibility: 'public' as Community['visibility'],
    requiresApproval: false,
    tags: [] as string[],
    bannerUrl: '',
    iconUrl: ''
  });

  const [tagInput, setTagInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Icon upload state
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [iconUploading, setIconUploading] = useState(false);
  const [iconUploadProgress, setIconUploadProgress] = useState<UploadProgress | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    { value: 'mathematics', label: 'Mathematics' },
    { value: 'physics', label: 'Physics' },
    { value: 'chemistry', label: 'Chemistry' },
    { value: 'biology', label: 'Biology' },
    { value: 'computer-science', label: 'Computer Science' },
    { value: 'engineering', label: 'Engineering' },
    { value: 'literature', label: 'Literature' },
    { value: 'history', label: 'History' },
    { value: 'other', label: 'Other' }
  ];

  // Icon upload handlers
  const validateIconFile = (file: File): { isValid: boolean; error?: string } => {
    // Check file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      return {
        isValid: false,
        error: 'Please select a PNG, JPG, JPEG, or SVG file'
      };
    }

    // Check file size (2MB limit)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `File size must be less than 2MB. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`
      };
    }

    return { isValid: true };
  };

  const handleIconFileSelect = useCallback((file: File) => {
    console.log('📁 [ICON] File selected:', file.name, file.type, file.size);

    const validation = validateIconFile(file);
    if (!validation.isValid) {
      showToast({
        type: 'error',
        title: 'Invalid File',
        message: validation.error || 'Invalid file selected'
      });
      return;
    }

    setIconFile(file);

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setIconPreview(previewUrl);

    console.log('✅ [ICON] File validated and preview created');
  }, [showToast]);

  const handleIconInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleIconFileSelect(file);
    }
  };

  const handleIconDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleIconFileSelect(file);
    }
  }, [handleIconFileSelect]);

  const handleIconDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleIconDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const removeIcon = () => {
    setIconFile(null);
    if (iconPreview) {
      URL.revokeObjectURL(iconPreview);
      setIconPreview(null);
    }
    setIconUploadProgress(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    console.log('🗑️ [ICON] Icon removed');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('📝 Submitting community creation form:', formData);

    if (!formData.name.trim()) {
      console.log('❌ Validation failed: Community name is required');
      showToast({
        type: 'error',
        title: 'Validation Error',
        message: 'Community name is required'
      });
      return;
    }

    if (!user) {
      showToast({
        type: 'error',
        title: 'Authentication Error',
        message: 'You must be logged in to create a community'
      });
      return;
    }

    setLoading(true);

    try {
      console.log('🚀 Creating community with form data:', formData);

      const communityData = {
        ...formData,
        name: formData.name.trim(),
        description: formData.description.trim(),
        visibility: formData.visibility,
        settings: {
          allowMemberInvites: true,
          allowFileUploads: true,
          maxFileSize: 10,
          allowedFileTypes: ['pdf', 'doc', 'docx', 'txt', 'jpg', 'png', 'gif']
        }
      };

      console.log('📝 Final community data being sent:', communityData);

      // Use the new service function that handles icon upload
      const community = await createCommunityWithIcon(
        communityData,
        user.uid,
        iconFile || undefined,
        (progress) => {
          setIconUploadProgress(progress);
          setIconUploading(true);
          console.log(`📤 [ICON] Upload progress: ${progress.percentage}%`);
        },
        user.email,
        user.displayName
      );

      console.log('✅ Community created successfully:', community);

      // Update the store with the new community
      const { joinedCommunities, setActiveCommunity } = useCommunityStore.getState();
      useCommunityStore.setState({
        joinedCommunities: [...joinedCommunities, community],
        activeCommunity: community
      });

      showToast({
        type: 'success',
        title: 'Community Created',
        message: `${formData.name} has been created successfully! ${iconFile ? 'Icon uploaded successfully.' : ''}`
      });

      // Cleanup preview URL
      if (iconPreview) {
        URL.revokeObjectURL(iconPreview);
      }

      closeModal();
    } catch (error) {
      console.error('❌ Community creation failed:', error);
      showToast({
        type: 'error',
        title: 'Creation Failed',
        message: error instanceof Error ? error.message : 'Failed to create community'
      });
    } finally {
      setLoading(false);
      setIconUploading(false);
      setIconUploadProgress(null);
    }
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !formData.tags.includes(tag) && formData.tags.length < 5) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const handleTagKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <BaseModal title="Create New Community" size="lg">
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Basic Information */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Community Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter community name"
              maxLength={50}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Describe your community's purpose and goals"
              rows={3}
              maxLength={500}
            />
          </div>

          {/* Community Icon Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Community Icon (Optional)
            </label>
            <div className="space-y-3">
              {/* Upload Area */}
              <div
                onDrop={handleIconDrop}
                onDragOver={handleIconDragOver}
                onDragLeave={handleIconDragLeave}
                className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                }`}
              >
                {!iconPreview && (
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                    onChange={handleIconInputChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={iconUploading || loading}
                  />
                )}

                <div className="text-center">
                  {iconPreview ? (
                    /* Preview */
                    <div className="flex items-center justify-center space-x-4">
                      <div className="relative">
                        <img
                          src={iconPreview}
                          alt="Icon preview"
                          className="w-16 h-16 rounded-lg object-cover border border-gray-200 dark:border-gray-600"
                        />
                        {iconUploading && (
                          <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {iconFile?.name}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {iconFile ? `${(iconFile.size / 1024).toFixed(1)} KB` : ''}
                        </p>
                        {iconUploadProgress && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                              <span>Uploading...</span>
                              <span>{iconUploadProgress.percentage}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-1">
                              <div
                                className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${iconUploadProgress.percentage}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          removeIcon();
                        }}
                        disabled={iconUploading || loading}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                        title="Remove icon"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : (
                    /* Upload prompt */
                    <div>
                      <ImageIcon size={32} className="mx-auto text-gray-400 mb-2" />
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                        <span className="font-medium text-blue-600 dark:text-blue-400">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        PNG, JPG, JPEG, or SVG (max 2MB)
                      </p>
                    </div>
                  )}
                </div>

                {/* Add a "Change Image" button when preview is shown */}
                {iconPreview && (
                  <div className="mt-4 text-center">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={iconUploading || loading}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors disabled:opacity-50"
                    >
                      Change Image
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                      onChange={handleIconInputChange}
                      className="hidden"
                      disabled={iconUploading || loading}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as Community['category'] }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {categories.map(category => (
                  <option key={category.value} value={category.value}>
                    {category.label}
                  </option>
                ))}
              </select>
            </div>


          </div>
        </div>

        {/* Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Settings</h3>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="requiresApproval"
              checked={formData.requiresApproval}
              onChange={(e) => setFormData(prev => ({ ...prev, requiresApproval: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="requiresApproval" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
              Require approval for new members
            </label>
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tags (up to 5)
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleTagKeyPress}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Add a tag"
                maxLength={20}
                disabled={formData.tags.length >= 5}
              />
              <button
                type="button"
                onClick={addTag}
                disabled={!tagInput.trim() || formData.tags.length >= 5}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add
              </button>
            </div>

            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-sm rounded-full"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => closeModal()}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || iconUploading || !formData.name.trim()}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {(loading || iconUploading) && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            <span>
              {iconUploading
                ? 'Uploading Icon...'
                : loading
                ? 'Creating...'
                : 'Create Community'
              }
            </span>
          </button>
        </div>
      </form>
    </BaseModal>
  );
};
