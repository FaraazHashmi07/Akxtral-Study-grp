import React from 'react';
import { motion } from 'framer-motion';
import { LogOut, X } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useAppStore } from '../../store/appStore';

export const SignOutConfirmModal: React.FC = () => {
  const { signOut } = useAuthStore();
  const { toggleSignOutConfirm } = useAppStore();

  const handleConfirmSignOut = async () => {
    try {
      console.log('🔄 [MODAL] Starting signout process...');
      toggleSignOutConfirm(); // Close modal immediately
      await signOut();
      console.log('✅ [MODAL] Signout completed');
    } catch (error) {
      console.error('❌ [MODAL] Sign out error:', error);
      // Still close the modal even if sign out fails
      toggleSignOutConfirm();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
              <LogOut className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Sign Out
            </h2>
          </div>
          <button
            onClick={toggleSignOutConfirm}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Are you sure you want to sign out? You'll need to sign in again to access your account.
        </p>

        <div className="flex space-x-3">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={toggleSignOutConfirm}
            className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            Cancel
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleConfirmSignOut}
            className="flex-1 px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            Sign Out
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
};