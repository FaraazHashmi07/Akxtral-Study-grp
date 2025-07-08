import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCommunityStore } from '../../store/communityStore';

export const CalendarSection: React.FC = () => {
  const { activeCommunity } = useCommunityStore();

  if (!activeCommunity) return null;

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Calendar size={24} className="text-blue-600 dark:text-blue-400" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Calendar
            </h1>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600">
              <button className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                <ChevronLeft size={20} />
              </button>
              <span className="px-4 py-2 text-gray-900 dark:text-white font-medium">
                January 2024
              </span>
              <button className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                <ChevronRight size={20} />
              </button>
            </div>
            <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
              <Plus size={20} />
              <span>New Event</span>
            </button>
          </div>
        </div>

        {/* Placeholder content */}
        <div className="text-center py-12">
          <Calendar size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            No events scheduled
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Create events and study sessions for your community.
          </p>
        </div>
      </div>
    </div>
  );
};
