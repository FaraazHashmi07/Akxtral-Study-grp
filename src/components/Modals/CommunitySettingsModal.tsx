import React, { useState, useRef, useEffect } from 'react';
import { BaseModal } from '../UI/ModalContainer';
import { Community } from '../../types';
import { useUIStore } from '../../store/uiStore';
import { useCommunityStore } from '../../store/communityStore';
import { Upload, X, Save, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { UploadProgress } from '../../services/storageService';

interface CommunitySettingsModalProps {
  community: Community;
}

const categories = [
  { value: 'study', label: 'Study Group' },
  { value: 'project', label: 'Project Team' },
  { value: 'hobby', label: 'Hobby & Interest' },
  { value: 'professional', label: 'Professional' },
  { value: 'social', label: 'Social' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'other', label: 'Other' }
];

export const CommunitySettingsModal: React.FC<CommunitySettingsModalProps> = ({ community }) => {
  const { closeModal } = useUIStore();
  const { updateCommunity, updateCommunityWithIcon } = useCommunityStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: community?.name || '',
    description: community?.description || '',
    category: community?.category || 'study',
    requiresApproval: community?.requiresApproval || false,
    tags: community?.tags || []
  });
  
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string>(community?.iconUrl || '');
  const [tagInput, setTagInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);

  // Sync form data with real-time community updates
  useEffect(() => {
    if (community) {
      console.log('🔄 [SETTINGS] Syncing form data with real-time community updates:', community.name);
      setFormData({
        name: community.name || '',
        description: community.description || '',
        category: community.category || 'study',
        requiresApproval: community.requiresApproval || false,
        tags: community.tags || []
      });
      
      // Update icon preview if community icon changed
      if (community.iconUrl && community.iconUrl !== iconPreview && !iconFile) {
        setIconPreview(community.iconUrl);
      }
    }
  }, [community, iconPreview, iconFile]);

  const handleIconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('File size must be less than 2MB');
        return;
      }
      
      const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please upload a PNG, JPG, JPEG, or SVG file');
        return;
      }
      
      setIconFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setIconPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Community name is required');
      return;
    }
    
    setIsLoading(true);
    setUploadProgress(null);
    
    try {
      const updateData = {
        ...formData,
        name: formData.name.trim(),
        description: formData.description.trim()
      };
      
      // Use updateCommunityWithIcon if there's an icon file, otherwise use regular update
      if (iconFile) {
        console.log('📤 Uploading community icon and updating settings...');
        await updateCommunityWithIcon(
          community.id, 
          updateData, 
          iconFile, 
          (progress: UploadProgress) => {
            setUploadProgress(progress);
            console.log(`📊 Upload progress: ${progress.percentage}%`);
          }
        );
        toast.success('Community settings and icon updated successfully!');
      } else {
        console.log('📝 Updating community settings without icon...');
        await updateCommunity(community.id, updateData);
        toast.success('Community settings updated successfully!');
      }
      
      closeModal();
    } catch (error) {
      console.error('Error updating community:', error);
      toast.error('Failed to update community settings');
    } finally {
      setIsLoading(false);
      setUploadProgress(null);
    }
  };

  return (
    <BaseModal title={`${community?.name} Settings`} size="lg">
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Community Icon */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Community Icon</h3>
          
          <div className="flex items-center space-x-4">
            <div className="relative">
              {iconPreview ? (
                <img
                  src={iconPreview}
                  alt="Community icon"
                  className="w-20 h-20 rounded-lg object-cover border-2 border-gray-200 dark:border-gray-600"
                />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                  <Camera className="w-8 h-8 text-gray-400" />
                </div>
              )}
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-600 hover:bg-blue-700 text-white rounded-full flex items-center justify-center transition-colors"
              >
                <Upload className="w-4 h-4" />
              </button>
            </div>
            
            <div className="flex-1">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Upload a new community icon
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                PNG, JPG, JPEG, or SVG (max 2MB)
              </p>
            </div>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/svg+xml"
            onChange={handleIconUpload}
            className="hidden"
          />
        </div>

        {/* Basic Information */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Basic Information</h3>
          
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
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              placeholder="Describe your community..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
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

        {/* Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Settings</h3>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="requiresApproval"
              checked={formData.requiresApproval}
              onChange={(e) => setFormData(prev => ({ ...prev, requiresApproval: e.target.checked }))}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
            />
            <label htmlFor="requiresApproval" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
              Require approval for new members
            </label>
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">Tags</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Add Tags (max 5)
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleTagKeyPress}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter a tag"
                disabled={formData.tags.length >= 5}
              />
              <button
                type="button"
                onClick={addTag}
                disabled={!tagInput.trim() || formData.tags.length >= 5}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          {formData.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-2 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                  >
                    <X size={14} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => closeModal()}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || !formData.name.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center space-x-2"
          >
            <Save size={16} />
            <span>
              {isLoading ? (
                uploadProgress ? 
                  `Uploading... ${Math.round(uploadProgress.percentage)}%` : 
                  'Saving...'
              ) : 'Save Changes'}
            </span>
          </button>
          
          {/* Upload Progress Bar */}
          {uploadProgress && (
            <div className="w-full mt-2">
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                <span>Uploading icon...</span>
                <span>{Math.round(uploadProgress.percentage)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress.percentage}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </form>
    </BaseModal>
  );
};
