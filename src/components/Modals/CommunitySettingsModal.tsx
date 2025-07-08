import React from 'react';
import { BaseModal } from '../UI/ModalContainer';
import { Community } from '../../types';

interface CommunitySettingsModalProps {
  community: Community;
}

export const CommunitySettingsModal: React.FC<CommunitySettingsModalProps> = ({ community }) => {
  return (
    <BaseModal title={`${community?.name} Settings`}>
      <div className="p-6">
        <p className="text-gray-600 dark:text-gray-400">
          Community Settings modal content will be implemented here.
        </p>
      </div>
    </BaseModal>
  );
};
