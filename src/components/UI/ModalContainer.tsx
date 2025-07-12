import React from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';

// Import modal components (we'll create these later)
import { CreateCommunityModal } from '../Modals/CreateCommunityModal';
import { DiscoverCommunitiesModal } from '../Modals/DiscoverCommunitiesModal';
import { CommunitySettingsModal } from '../Modals/CommunitySettingsModal';
import { CreateChannelModal } from '../Modals/CreateChannelModal';
import { MemberListModal } from '../Modals/MemberListModal';
import { UserSettingsModal } from '../Modals/UserSettingsModal';
import { JoinRequestsModal } from '../Modals/JoinRequestsModal';
import { DeleteCommunityModal } from '../Modals/DeleteCommunityModal';
import { UploadResourceModal } from '../Modals/UploadResourceModal';

export const ModalContainer: React.FC = () => {
  const { activeModal, modals, closeModal } = useUIStore();

  if (!activeModal) return null;

  const modalData = modals[activeModal] || {};

  const renderModal = () => {
    switch (activeModal) {
      case 'createCommunity':
        return <CreateCommunityModal />;
      case 'discoverCommunities':
        return <DiscoverCommunitiesModal />;
      case 'communitySettings':
        return <CommunitySettingsModal community={modalData.community} />;
      case 'createChannel':
        return <CreateChannelModal communityId={modalData.communityId} />;
      case 'memberList':
        return <MemberListModal communityId={modalData.communityId} />;
      case 'userSettings':
        return <UserSettingsModal />;
      case 'joinRequests':
        return <JoinRequestsModal
          communityId={modalData.communityId}
          communityName={modalData.communityName}
        />;
      case 'deleteCommunity':
        return <DeleteCommunityModal
          communityId={modalData.communityId}
          communityName={modalData.communityName}
        />;
      case 'uploadResource':
        return <UploadResourceModal
          communityId={modalData.communityId}
        />;
      default:
        return null;
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {renderModal()}
      </motion.div>
    </motion.div>
  );
};

// Base modal wrapper component for consistent styling
interface BaseModalProps {
  title: string;
  children: React.ReactNode;
  onClose?: () => void;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
}

export const BaseModal: React.FC<BaseModalProps> = ({
  title,
  children,
  onClose,
  size = 'md',
  showCloseButton = true
}) => {
  const { closeModal } = useUIStore();

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      closeModal();
    }
  };

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl'
  };

  return (
    <div className={`w-full ${sizeClasses[size]}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          {title}
        </h2>
        {showCloseButton && (
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="max-h-[calc(90vh-120px)] overflow-y-auto">
        {children}
      </div>
    </div>
  );
};
