import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { BaseModal } from '../UI/ModalContainer';
import { useUIStore } from '../../store/uiStore';
import { useCommunityStore } from '../../store/communityStore';
import { useAuthStore } from '../../store/authStore';

interface DeleteCommunityModalProps {
  communityId: string;
  communityName: string;
}

export const DeleteCommunityModal: React.FC<DeleteCommunityModalProps> = ({ 
  communityId, 
  communityName 
}) => {
  const { closeModal, showToast, setActiveCommunity } = useUIStore();
  const { deleteCommunity } = useCommunityStore();
  const { user } = useAuthStore();
  
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  
  const expectedText = `DELETE ${communityName}`;
  const isConfirmationValid = confirmationText === expectedText;

  const handleDelete = async () => {
    if (!isConfirmationValid || !user) return;
    
    setIsDeleting(true);
    
    try {
      console.log('🗑️ [MODAL] Deleting community:', communityName);

      await deleteCommunity(communityId);
      
      showToast({
        type: 'success',
        title: 'Community Deleted',
        message: `${communityName} has been permanently deleted`
      });
      
      // Clear active community and close modal
      setActiveCommunity(null);
      closeModal();
      
      console.log('✅ [MODAL] Community deletion completed');
      
    } catch (error) {
      console.error('❌ [MODAL] Failed to delete community:', error);
      showToast({
        type: 'error',
        title: 'Deletion Failed',
        message: error instanceof Error ? error.message : 'Failed to delete community'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <BaseModal title="Delete Community" size="md">
      <div className="p-6">
        {/* Warning Header */}
        <div className="flex items-center space-x-3 mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertTriangle className="text-red-600 dark:text-red-400" size={24} />
          <div>
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
              Permanent Deletion Warning
            </h3>
            <p className="text-red-700 dark:text-red-300 text-sm">
              This action cannot be undone
            </p>
          </div>
        </div>

        {/* Consequences List */}
        <div className="mb-6">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">
            Deleting "{communityName}" will permanently:
          </h4>
          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <li className="flex items-center space-x-2">
              <X size={16} className="text-red-500" />
              <span>Remove all community data (messages, resources, events)</span>
            </li>
            <li className="flex items-center space-x-2">
              <X size={16} className="text-red-500" />
              <span>Remove all member access and roles</span>
            </li>
            <li className="flex items-center space-x-2">
              <X size={16} className="text-red-500" />
              <span>Delete all pending join requests</span>
            </li>
            <li className="flex items-center space-x-2">
              <X size={16} className="text-red-500" />
              <span>Notify all members about the deletion</span>
            </li>
          </ul>
        </div>

        {/* Confirmation Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Type <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 rounded">{expectedText}</span> to confirm:
          </label>
          <input
            type="text"
            value={confirmationText}
            onChange={(e) => setConfirmationText(e.target.value)}
            placeholder={expectedText}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            disabled={isDeleting}
          />
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button
            onClick={closeModal}
            disabled={isDeleting}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          
          <button
            onClick={handleDelete}
            disabled={!isConfirmationValid || isDeleting}
            className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors flex items-center justify-center space-x-2 ${
              isConfirmationValid && !isDeleting
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            {isDeleting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 size={16} />
                <span>Delete Community</span>
              </>
            )}
          </button>
        </div>

        {/* Additional Warning */}
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
            All community members will be notified about this deletion.
            This action is immediate and cannot be reversed.
          </p>
        </div>
      </div>
    </BaseModal>
  );
};
