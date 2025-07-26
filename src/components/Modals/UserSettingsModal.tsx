import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { User, Mail, Shield, Save, Image as ImageIcon, Trash2, AlertTriangle } from 'lucide-react';
import { BaseModal } from '../UI/ModalContainer';
import { useAuthStore } from '../../store/authStore';
import { useUIStore } from '../../store/uiStore';
import { uploadUserAvatar, deleteUserAvatar, deleteUserAccount } from '../../lib/userProfile';

export const UserSettingsModal: React.FC = () => {
  const { user, updateProfile, refreshUserProfile } = useAuthStore();
  const { theme, setTheme, closeModal, showToast } = useUIStore();

  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    displayName: user?.displayName || ''
  });
  const [loading, setLoading] = useState(false);

  // Profile image upload state
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(user?.photoURL || null);
  const [profileImageUploading, setProfileImageUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Account deletion state
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'account', label: 'Account', icon: Shield }
  ];

  // Profile image upload handlers
  const validateProfileImageFile = (file: File): { isValid: boolean; error?: string } => {
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

  const handleProfileImageFileSelect = useCallback((file: File) => {
    console.log('📁 [PROFILE] File selected:', file.name, file.type, file.size);

    const validation = validateProfileImageFile(file);
    if (!validation.isValid) {
      showToast({
        type: 'error',
        title: 'Invalid File',
        message: validation.error || 'Invalid file selected'
      });
      return;
    }

    setProfileImageFile(file);

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setProfileImagePreview(previewUrl);

    console.log('✅ [PROFILE] File validated and preview created');
  }, [showToast]);

  const handleProfileImageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProfileImageFileSelect(file);
    }
  };

  const handleProfileImageDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProfileImageFileSelect(file);
    }
  }, [handleProfileImageFileSelect]);

  const handleProfileImageDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleProfileImageDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const removeProfileImage = () => {
    setProfileImageFile(null);
    if (profileImagePreview && profileImagePreview !== user?.photoURL) {
      URL.revokeObjectURL(profileImagePreview);
    }
    setProfileImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    console.log('🗑️ [PROFILE] Profile image removed');
  };

  // Account deletion handlers
  const handleDeleteAccount = async () => {
    if (!user) return;

    // Verify confirmation text
    if (deleteConfirmationText !== 'DELETE') {
      showToast({
        type: 'error',
        title: 'Confirmation Required',
        message: 'Please type "DELETE" to confirm account deletion'
      });
      return;
    }

    setIsDeleting(true);
    try {
      console.log('🗑️ [ACCOUNT] Starting account deletion process...');

      // Delete user account and all related data
      await deleteUserAccount(user.uid);

      showToast({
        type: 'success',
        title: 'Account Deleted',
        message: 'Your account has been permanently deleted. You will be redirected to the login page.'
      });

      // Close modal and redirect will happen automatically via auth state change
      closeModal();
    } catch (error) {
      console.error('❌ [ACCOUNT] Account deletion failed:', error);
      showToast({
        type: 'error',
        title: 'Deletion Failed',
        message: error instanceof Error ? error.message : 'Failed to delete account. Please try again.'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteConfirmation = () => {
    setShowDeleteConfirmation(true);
    setDeleteConfirmationText('');
  };

  const closeDeleteConfirmation = () => {
    setShowDeleteConfirmation(false);
    setDeleteConfirmationText('');
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      let photoURL = user?.photoURL || '';

      // Handle profile image upload if a new file is selected
      if (profileImageFile && user) {
        setProfileImageUploading(true);
        console.log('📤 [PROFILE] Uploading profile image...');

        try {
          photoURL = await uploadUserAvatar(user.uid, profileImageFile);
          console.log('✅ [PROFILE] Profile image uploaded successfully:', photoURL);
        } catch (uploadError) {
          console.error('❌ [PROFILE] Profile image upload failed:', uploadError);
          throw new Error('Failed to upload profile image');
        } finally {
          setProfileImageUploading(false);
        }
      }

      // Handle profile image removal if user had an image but now it's removed
      if (!profileImagePreview && user?.photoURL && user) {
        try {
          await deleteUserAvatar(user.uid, user.photoURL);
          photoURL = '';
          console.log('🗑️ [PROFILE] Profile image deleted successfully');
        } catch (deleteError) {
          console.error('❌ [PROFILE] Profile image deletion failed:', deleteError);
          // Don't throw error for deletion failure, just log it
        }
      }

      await updateProfile({
        displayName: formData.displayName,
        photoURL
      });

      // Refresh user profile to ensure UI is updated
      await refreshUserProfile();

      showToast({
        type: 'success',
        title: 'Settings Updated',
        message: `Your settings have been saved successfully! ${profileImageFile ? 'Profile image updated.' : ''}`
      });

      // Cleanup preview URL
      if (profileImagePreview && profileImagePreview !== user?.photoURL) {
        URL.revokeObjectURL(profileImagePreview);
      }

      closeModal();
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Update Failed',
        message: error instanceof Error ? error.message : 'Failed to update settings'
      });
    } finally {
      setLoading(false);
      setProfileImageUploading(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            {/* Profile Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Profile Image (Optional)
              </label>
              <div className="space-y-3">
                {/* Upload Area */}
                <div
                  onDrop={handleProfileImageDrop}
                  onDragOver={handleProfileImageDragOver}
                  onDragLeave={handleProfileImageDragLeave}
                  className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
                    dragActive
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
                  }`}
                >
                  {!profileImagePreview && (
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                      onChange={handleProfileImageInputChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      disabled={profileImageUploading || loading}
                    />
                  )}

                  <div className="text-center">
                    {profileImagePreview ? (
                      /* Preview */
                      <div className="flex items-center justify-center space-x-4">
                        <div className="relative">
                          <img
                            src={profileImagePreview}
                            alt="Profile preview"
                            className="w-16 h-16 rounded-full object-cover border border-gray-200 dark:border-gray-600"
                          />
                          {profileImageUploading && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {profileImageFile?.name || 'Current profile image'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {profileImageFile ? `${(profileImageFile.size / 1024).toFixed(1)} KB` : 'Uploaded'}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            removeProfileImage();
                          }}
                          disabled={profileImageUploading || loading}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                          title="Remove profile image"
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
                  {profileImagePreview && (
                    <div className="mt-4 text-center">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={profileImageUploading || loading}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors disabled:opacity-50"
                      >
                        Change Image
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                        onChange={handleProfileImageInputChange}
                        className="hidden"
                        disabled={profileImageUploading || loading}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => setFormData(prev => ({ ...prev, displayName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter your display name"
              />
            </div>
          </div>
        );

      case 'account':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                />
                {user?.emailVerified ? (
                  <span className="text-green-600 dark:text-green-400 text-sm">Verified</span>
                ) : (
                  <button className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                    Verify
                  </button>
                )}
              </div>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                Account Security
              </h4>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mb-3">
                Keep your account secure by using a strong password and enabling two-factor authentication.
              </p>
              <button className="text-sm text-yellow-800 dark:text-yellow-200 hover:underline">
                Change Password
              </button>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-2 flex items-center space-x-2">
                <AlertTriangle size={16} />
                <span>Danger Zone</span>
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300 mb-3">
                Once you delete your account, there is no going back. This will permanently delete your account,
                remove you from all communities, cancel any pending join requests, and delete all your data.
              </p>
              <button
                onClick={openDeleteConfirmation}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete Account
              </button>
            </div>
          </div>
        );



      default:
        return null;
    }
  };

  return (
    <BaseModal title="Settings" size="lg">
      <div className="flex" style={{ height: activeTab === 'account' ? '500px' : '400px' }}>
        {/* Sidebar */}
        <div className="w-48 border-r border-gray-200 dark:border-gray-700 p-4">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 text-sm rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {renderTabContent()}
          </motion.div>
        </div>
      </div>

      {/* Footer - Only show for profile tab */}
      {activeTab === 'profile' && (
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => closeModal()}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || profileImageUploading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {(loading || profileImageUploading) && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            )}
            <Save size={16} />
            <span>
              {profileImageUploading ? 'Uploading Image...' : loading ? 'Saving...' : 'Save Changes'}
            </span>
          </button>
        </div>
      )}

      {/* Footer for account tab - Just close button */}
      {activeTab === 'account' && (
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => closeModal()}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal Overlay */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 p-6 max-w-md w-full mx-4"
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Delete Account
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  This action cannot be undone
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-sm text-red-800 dark:text-red-200 font-medium mb-2">
                  This will permanently:
                </p>
                <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                  <li>• Delete your account and profile</li>
                  <li>• Remove you from all communities</li>
                  <li>• Cancel any pending join requests</li>
                  <li>• Delete all your messages and data</li>
                  <li>• Remove your uploaded files and resources</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Type <span className="font-bold text-red-600 dark:text-red-400">DELETE</span> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteConfirmationText}
                  onChange={(e) => setDeleteConfirmationText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Type DELETE to confirm"
                  disabled={isDeleting}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={closeDeleteConfirmation}
                disabled={isDeleting}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={isDeleting || deleteConfirmationText !== 'DELETE'}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isDeleting && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                <span>{isDeleting ? 'Deleting...' : 'Delete Account'}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </BaseModal>
  );
};
