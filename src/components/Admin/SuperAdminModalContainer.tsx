import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSuperAdminStore } from '../../store/superAdminStore';
import { CommunityDetailModal } from './modals/CommunityDetailModal';

export const SuperAdminModalContainer: React.FC = () => {
  const { activeModal, modalData, closeModal } = useSuperAdminStore();

  const renderModal = () => {
    if (!activeModal || !modalData) return null;

    switch (activeModal) {
      case 'communityDetail':
        return (
          <CommunityDetailModal
            community={modalData.community}
            onClose={closeModal}
          />
        );
      default:
        return null;
    }
  };

  if (!activeModal) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50"
      >
        {renderModal()}
      </motion.div>
    </AnimatePresence>
  );
};
