import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Download, 
  Eye, 
  Heart, 
  MoreVertical, 
  File, 
  FileText, 
  Image, 
  Archive,
  Calendar,
  User,
  Tag,
  Trash2,
  Edit3
} from 'lucide-react';
import { Resource } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { useResourceStore } from '../../store/resourceStore';
import { useUIStore } from '../../store/uiStore';
import { canBulkManageResources } from '../../lib/authorization';

interface ResourceCardProps {
  resource: Resource;
  viewMode: 'grid' | 'list';
  communityId: string;
}

export const ResourceCard: React.FC<ResourceCardProps> = ({ 
  resource, 
  viewMode, 
  communityId 
}) => {
  const { user } = useAuthStore();
  const { deleteResource, downloadResource } = useResourceStore();
  const { showToast } = useUIStore();
  const [showActions, setShowActions] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwner = user?.uid === resource.uploadedBy;
  const canManage = user && canBulkManageResources(user, communityId);
  const canDelete = isOwner || canManage;

  // Get file icon based on type
  const getFileIcon = () => {
    if (resource.mimeType?.startsWith('image/')) {
      return <Image size={20} className="text-blue-500" />;
    }
    if (resource.mimeType?.includes('pdf')) {
      return <FileText size={20} className="text-red-500" />;
    }
    if (resource.mimeType?.includes('zip') || resource.mimeType?.includes('rar')) {
      return <Archive size={20} className="text-yellow-500" />;
    }
    return <File size={20} className="text-gray-500" />;
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle download - actually download the file to user's system
  const handleDownload = async () => {
    try {
      // Track download first
      await downloadResource(resource.id);

      // Try to download the file using fetch and blob for better compatibility
      try {
        const response = await fetch(resource.url);
        if (!response.ok) throw new Error('Network response was not ok');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);

        // Create a temporary anchor element to trigger download
        const link = document.createElement('a');
        link.href = url;
        link.download = resource.name;

        // Append to body, click, and remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // Clean up the blob URL
        window.URL.revokeObjectURL(url);
      } catch (fetchError) {
        // Fallback to direct link method
        console.warn('Fetch download failed, using fallback method:', fetchError);
        const link = document.createElement('a');
        link.href = resource.url;
        link.download = resource.name;
        link.target = '_blank';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      showToast({
        type: 'success',
        title: 'Download Started',
        message: `Downloading ${resource.name}`
      });
    } catch (error) {
      console.error('Download failed:', error);
      showToast({
        type: 'error',
        title: 'Download Failed',
        message: 'Could not download the file. Please try again.'
      });
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!canDelete) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${resource.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    setIsDeleting(true);
    try {
      await deleteResource(resource.id);
      showToast({
        type: 'success',
        title: 'Resource Deleted',
        message: `${resource.name} has been deleted`
      });
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Delete Failed',
        message: error instanceof Error ? error.message : 'Could not delete the resource'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (viewMode === 'grid') {
    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow relative group"
      >
        {/* Actions Menu */}
        {canDelete && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="relative">
              <button
                onClick={() => setShowActions(!showActions)}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
              >
                <MoreVertical size={16} />
              </button>
              
              {showActions && (
                <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-10 min-w-[120px]">
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2 disabled:opacity-50"
                  >
                    <Trash2 size={14} />
                    <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* File Icon */}
        <div className="flex items-center justify-center w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg mb-3">
          {getFileIcon()}
        </div>

        {/* File Info */}
        <div className="space-y-2">
          <h3 className="font-medium text-gray-900 dark:text-white truncate" title={resource.name}>
            {resource.name}
          </h3>
          
          {resource.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
              {resource.description}
            </p>
          )}

          {/* Tags */}
          {resource.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {resource.tags.slice(0, 2).map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                >
                  <Tag size={10} className="mr-1" />
                  {tag}
                </span>
              ))}
              {resource.tags.length > 2 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  +{resource.tags.length - 2} more
                </span>
              )}
            </div>
          )}

          {/* Metadata */}
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-1">
              <Calendar size={12} />
              <span>{resource.uploadedAt.toLocaleDateString()}</span>
            </div>
            {resource.fileSize && (
              <span>{formatFileSize(resource.fileSize)}</span>
            )}
          </div>

          {/* Stats */}
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-1">
                <Download size={12} />
                <span>{resource.downloads}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Heart size={12} />
                <span>{resource.likes.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-4 flex space-x-2">
          <button
            onClick={handleDownload}
            className="flex-1 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center justify-center space-x-1"
          >
            <Download size={14} />
            <span>Download</span>
          </button>
          <button
            onClick={() => window.open(resource.url, '_blank')}
            className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Eye size={14} />
          </button>
        </div>
      </motion.div>
    );
  }

  // List view
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-sm transition-shadow"
    >
      <div className="flex items-center space-x-4">
        {/* File Icon */}
        <div className="flex-shrink-0">
          <div className="flex items-center justify-center w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg">
            {getFileIcon()}
          </div>
        </div>

        {/* File Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900 dark:text-white truncate">
              {resource.name}
            </h3>
            <div className="flex items-center space-x-2 ml-4">
              {resource.fileSize && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {formatFileSize(resource.fileSize)}
                </span>
              )}
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {resource.uploadedAt.toLocaleDateString()}
              </span>
            </div>
          </div>

          {resource.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 truncate">
              {resource.description}
            </p>
          )}

          <div className="flex items-center justify-between mt-2">
            {/* Tags */}
            <div className="flex items-center space-x-2">
              {resource.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                >
                  <Tag size={10} className="mr-1" />
                  {tag}
                </span>
              ))}
            </div>

            {/* Stats and Actions */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center space-x-1">
                  <Download size={12} />
                  <span>{resource.downloads}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Heart size={12} />
                  <span>{resource.likes.length}</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.open(resource.url, '_blank')}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                  title="Preview"
                >
                  <Eye size={16} />
                </button>
                <button
                  onClick={handleDownload}
                  className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                >
                  Download
                </button>
                {canDelete && (
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="p-1 text-red-400 hover:text-red-600 dark:hover:text-red-300 rounded disabled:opacity-50"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
