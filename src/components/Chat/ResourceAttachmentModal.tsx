import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, FileText, Image, Video, File, Send } from 'lucide-react';
import { Resource } from '../../types';
import { useResourceStore } from '../../store/resourceStore';
import { useChatStore } from '../../store/chatStore';

interface ResourceAttachmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  communityId: string;
}

export const ResourceAttachmentModal: React.FC<ResourceAttachmentModalProps> = ({
  isOpen,
  onClose,
  communityId
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const { resources, loadResources } = useResourceStore();
  const { sendResourceMessage } = useChatStore();

  useEffect(() => {
    if (isOpen && communityId) {
      loadResources(communityId);
    }
  }, [isOpen, communityId, loadResources]);

  const communityResources = resources[communityId] || [];
  
  const filteredResources = communityResources.filter(resource =>
    resource.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resource.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image;
    if (type.startsWith('video/')) return Video;
    if (type.includes('pdf') || type.includes('document')) return FileText;
    return File;
  };

  const handleSendResource = async () => {
    if (!selectedResource) return;

    try {
      await sendResourceMessage(
        communityId,
        selectedResource.id,
        selectedResource.name,
        selectedResource.url,
        selectedResource.type,
        selectedResource.uploadedBy,
        selectedResource.uploadedByName || 'Unknown User' // Handle undefined with fallback
      );
      onClose();
      setSelectedResource(null);
      setSearchTerm('');
    } catch (error) {
      console.error('Failed to send resource:', error);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Attach Resource
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Search */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search resources..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {/* Resources list */}
            <div className="flex-1 overflow-y-auto p-6">
              {filteredResources.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {searchTerm ? 'No resources found matching your search.' : 'No resources available in this community.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredResources.map((resource) => {
                    const IconComponent = getFileIcon(resource.type);
                    const isSelected = selectedResource?.id === resource.id;
                    
                    return (
                      <motion.button
                        key={resource.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedResource(resource)}
                        className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                            isSelected 
                              ? 'bg-blue-100 dark:bg-blue-900/40' 
                              : 'bg-gray-100 dark:bg-gray-700'
                          }`}>
                            <IconComponent className={`w-5 h-5 ${
                              isSelected 
                                ? 'text-blue-600 dark:text-blue-400' 
                                : 'text-gray-600 dark:text-gray-400'
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className={`font-medium truncate ${
                              isSelected 
                                ? 'text-blue-900 dark:text-blue-100' 
                                : 'text-gray-900 dark:text-white'
                            }`}>
                              {resource.name}
                            </h3>
                            <p className={`text-sm truncate ${
                              isSelected
                                ? 'text-blue-700 dark:text-blue-300'
                                : 'text-gray-600 dark:text-gray-400'
                            }`}>
                              Uploaded by {resource.uploadedByName || 'Unknown User'}
                            </p>
                            {resource.description && (
                              <p className={`text-sm mt-1 line-clamp-2 ${
                                isSelected 
                                  ? 'text-blue-600 dark:text-blue-400' 
                                  : 'text-gray-500 dark:text-gray-500'
                              }`}>
                                {resource.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSendResource}
                disabled={!selectedResource}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
                <span>Share to Chat</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
