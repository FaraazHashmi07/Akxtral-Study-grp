import React from 'react';
import { BaseModal } from '../UI/ModalContainer';

interface MemberListModalProps {
  communityId: string;
}

export const MemberListModal: React.FC<MemberListModalProps> = ({ communityId }) => {
  return (
    <BaseModal title="Community Members">
      <div className="p-6">
        <p className="text-gray-600 dark:text-gray-400">
          Member List modal content will be implemented here.
        </p>
      </div>
    </BaseModal>
  );
};
