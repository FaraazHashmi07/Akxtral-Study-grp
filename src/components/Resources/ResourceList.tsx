import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Filter, SortAsc, SortDesc } from 'lucide-react';
import { Resource } from '../../types';
import { ResourceCard } from './ResourceCard';
import { useResourceStore } from '../../store/resourceStore';

interface ResourceListProps {
  resources: Resource[];
  communityId: string;
  viewMode: 'grid' | 'list';
}

export const ResourceList: React.FC<ResourceListProps> = ({ 
  resources, 
  communityId, 
  viewMode 
}) => {
  const { 
    sortBy, 
    sortOrder, 
    selectedTags, 
    searchQuery,
    setSortBy,
    setSortOrder,
    setSelectedTags,
    setSearchQuery
  } = useResourceStore();

  // Get unique tags from all resources
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    resources.forEach(resource => {
      resource.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [resources]);

  // Filter and sort resources
  const filteredAndSortedResources = useMemo(() => {
    let filtered = resources;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(resource =>
        resource.name.toLowerCase().includes(query) ||
        resource.description?.toLowerCase().includes(query) ||
        resource.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply tag filter
    if (selectedTags.length > 0) {
      filtered = filtered.filter(resource =>
        selectedTags.some(tag => resource.tags.includes(tag))
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'uploadedAt':
          comparison = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
          break;

        default:
          comparison = 0;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [resources, searchQuery, selectedTags, sortBy, sortOrder]);

  const handleSortChange = (newSortBy: typeof sortBy) => {
    if (sortBy === newSortBy) {
      // Toggle sort order if same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new sort field with default order
      setSortBy(newSortBy);
      setSortOrder('desc');
    }
  };

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedTags([]);
  };

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {/* Sort and Filter Controls */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Sort Controls */}
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort by:</span>
              <div className="flex items-center space-x-1">
                {(['name', 'uploadedAt'] as const).map((field) => (
                  <button
                    key={field}
                    onClick={() => handleSortChange(field)}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors flex items-center space-x-1 ${
                      sortBy === field
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span className="capitalize">{field === 'uploadedAt' ? 'Date' : field}</span>
                    {sortBy === field && (
                      sortOrder === 'asc' ? <SortAsc size={14} /> : <SortDesc size={14} />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear Filters */}
            {(searchQuery || selectedTags.length > 0) && (
              <button
                onClick={clearFilters}
                className="px-3 py-1 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Tag Filters */}
          {availableTags.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Filter size={16} className="text-gray-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by tags:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => handleTagToggle(tag)}
                    className={`px-3 py-1 text-sm rounded-full transition-colors ${
                      selectedTags.includes(tag)
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border border-blue-300 dark:border-blue-600'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {filteredAndSortedResources.length} of {resources.length} resource{resources.length !== 1 ? 's' : ''}
          {searchQuery && ` matching "${searchQuery}"`}
          {selectedTags.length > 0 && ` with tags: ${selectedTags.join(', ')}`}
        </p>
      </div>

      {/* Resource Grid/List */}
      {filteredAndSortedResources.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Search size={48} className="mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No resources found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {searchQuery || selectedTags.length > 0
              ? 'Try adjusting your search or filters'
              : 'No resources have been uploaded yet'
            }
          </p>
          {(searchQuery || selectedTags.length > 0) && (
            <button
              onClick={clearFilters}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            : 'space-y-4'
        }>
          <AnimatePresence mode="popLayout">
            {filteredAndSortedResources.map((resource) => (
              <ResourceCard
                key={resource.id}
                resource={resource}
                viewMode={viewMode}
                communityId={communityId}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};
