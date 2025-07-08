import React from 'react';
import { BaseModal } from '../UI/ModalContainer';

interface CreateChannelModalProps {
  communityId: string;
}

export const CreateChannelModal: React.FC<CreateChannelModalProps> = ({ communityId }) => {
  return (
    <BaseModal title="Create Channel">
      <div className="p-6">
        <p className="text-gray-600 dark:text-gray-400">
          Create Channel modal content will be implemented here.
        </p>
      </div>
    </BaseModal>
  );
};
