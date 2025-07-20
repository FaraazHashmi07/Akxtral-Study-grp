import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useUIStore } from '../../store/uiStore';
import { useCommunityStore } from '../../store/communityStore';
import { ChatInterface } from '../Chat/ChatInterface';

export const ChatSection: React.FC = () => {
  const { activeCommunityId } = useUIStore();
  const { activeCommunity } = useCommunityStore();

  if (!activeCommunityId || !activeCommunity) {
    return (
      <div className="h-full flex items-center justify-center bg-white dark:bg-gray-900">
        <div className="text-center">
          <MessageCircle size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No Community Selected
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Select a community to start chatting with members.
          </p>
        </div>
      </div>
    );
  }

  return <ChatInterface communityId={activeCommunityId} />;
};
