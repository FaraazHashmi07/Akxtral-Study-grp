import React from 'react';
import { motion } from 'framer-motion';
import { Video, Plus, ExternalLink } from 'lucide-react';
import { useCommunityStore } from '../../store/communityStore';

export const MeetsSection: React.FC = () => {
  const { activeCommunity } = useCommunityStore();

  if (!activeCommunity) return null;

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Video size={24} className="text-blue-600 dark:text-blue-400" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Meets
            </h1>
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
            <Plus size={20} />
            <span>Create Meeting</span>
          </button>
        </div>

        {/* Placeholder content */}
        <div className="text-center py-12">
          <Video size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No meetings scheduled
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Create video meetings and study sessions for your community.
          </p>
        </div>
      </div>
    </div>
  );
};
