import React, { useEffect, useState } from 'react';
import { FolderOpen, Upload, Grid, List, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { useCommunityStore } from '../../store/communityStore';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { useResourceStore } from '../../store/resourceStore';
import { canUploadResources } from '../../lib/authorization';
import { ResourceList } from '../Resources/ResourceList';

export const ResourcesSection: React.FC = () => {
  const { activeCommunity } = useCommunityStore();
  const { openModal } = useUIStore(); // Removed showToast to prevent infinite re-renders
  const { user } = useAuthStore();
  const {
    resources,
    loading,
    error,
    viewMode,
    setViewMode
  } = useResourceStore(); // Removed loadResources to prevent infinite re-renders

  const [isRefreshing, setIsRefreshing] = useState(false);

  // Load resources when component mounts or community changes
  useEffect(() => {
    if (activeCommunity?.id) {
      // FIXED: Use getState() to avoid function dependencies that cause infinite re-renders
      const { loadResources: loadResourcesFunc } = useResourceStore.getState();
      const { showToast: showToastFunc } = useUIStore.getState();
      
      loadResourcesFunc(activeCommunity.id).catch((error) => {
        console.error('Failed to load resources:', error);
        showToastFunc({
          type: 'error',
          title: 'Failed to Load Resources',
          message: 'Could not load community resources. Please try again.'
        });
      });
    }
  }, [activeCommunity?.id]); // FIXED: Removed function dependencies

  // Early return after hooks
  if (!activeCommunity) return null;

  const communityResources = resources[activeCommunity.id] || [];

  // More permissive upload permissions - any authenticated user who can access the community
  const isAuthenticated = !!user;
  const canUpload = user && canUploadResources(user, activeCommunity.id);
  const uploadsAllowed = activeCommunity.settings?.allowFileUploads !== false;

  // Show upload button for any authenticated user (we'll validate permissions in the upload modal)
  const showUploadButton = isAuthenticated && uploadsAllowed;



  const handleUploadClick = () => {
    openModal('uploadResource', { communityId: activeCommunity.id });
  };

  const handleRefresh = async () => {
    if (!activeCommunity?.id || isRefreshing) return;

    setIsRefreshing(true);
    try {
      // FIXED: Use getState() to avoid function dependencies
      const { loadResources: loadResourcesFunc } = useResourceStore.getState();
      const { showToast: showToastFunc } = useUIStore.getState();
      
      await loadResourcesFunc(activeCommunity.id);
      showToastFunc({
        type: 'success',
        title: 'Resources Refreshed',
        message: 'Resource list has been updated'
      });
    } catch {
      const { showToast: showToastFunc } = useUIStore.getState();
      showToastFunc({
        type: 'error',
        title: 'Refresh Failed',
        message: 'Could not refresh resources. Please try again.'
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleViewModeChange = (mode: 'grid' | 'list') => {
    setViewMode(mode);
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <FolderOpen size={24} className="text-blue-600 dark:text-blue-400" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Resources
            </h1>
          </div>
          <div className="flex items-center space-x-3">
            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
              title="Refresh resources"
            >
              <RefreshCw size={20} className={isRefreshing ? 'animate-spin' : ''} />
            </button>

            {/* View Mode Toggle */}
            <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-600">
              <button
                onClick={() => handleViewModeChange('grid')}
                className={`p-2 transition-colors ${
                  viewMode === 'grid'
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                title="Grid view"
              >
                <Grid size={20} />
              </button>
              <button
                onClick={() => handleViewModeChange('list')}
                className={`p-2 transition-colors ${
                  viewMode === 'list'
                    ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
                title="List view"
              >
                <List size={20} />
              </button>
            </div>

            {/* Upload Button */}
            {showUploadButton && (
              <button
                onClick={handleUploadClick}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                <Upload size={20} />
                <span>Upload</span>
              </button>
            )}
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          // Loading State
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 size={48} className="mx-auto text-blue-600 dark:text-blue-400 mb-4 animate-spin" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Loading Resources
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Fetching community resources...
              </p>
            </div>
          </div>
        ) : error ? (
          // Error State
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                Failed to Load Resources
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {error}
              </p>
              <button
                onClick={handleRefresh}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : communityResources.length === 0 ? (
          // Empty State
          <div className="text-center py-12">
            <FolderOpen size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No resources yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Upload files and share resources with your community.
            </p>
            {showUploadButton && (
              <button
                onClick={handleUploadClick}
                className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                <Upload size={20} />
                <span>Upload First Resource</span>
              </button>
            )}
          </div>
        ) : (
          // Resources Display
          <ResourceList
            resources={communityResources}
            communityId={activeCommunity.id}
            viewMode={viewMode}
          />
        )}
      </div>
    </div>
  );
};
