import { create } from 'zustand';
import { Resource, ResourceTag } from '../types';

interface ResourceState {
  // State
  resources: Record<string, Resource[]>; // communityId -> resources
  tags: Record<string, ResourceTag[]>; // communityId -> tags
  loading: boolean;
  error: string | null;
  
  // View state
  viewMode: 'grid' | 'list';
  sortBy: 'name' | 'uploadedAt' | 'downloads' | 'likes';
  sortOrder: 'asc' | 'desc';
  selectedTags: string[];
  searchQuery: string;
  
  // Actions
  loadResources: (communityId: string) => Promise<void>;
  uploadResource: (communityId: string, file: File, metadata: Partial<Resource>) => Promise<Resource>;
  createLinkResource: (communityId: string, data: Partial<Resource>) => Promise<Resource>;
  updateResource: (resourceId: string, updates: Partial<Resource>) => Promise<void>;
  deleteResource: (resourceId: string) => Promise<void>;
  
  // Interactions
  downloadResource: (resourceId: string) => Promise<void>;
  likeResource: (resourceId: string) => Promise<void>;
  unlikeResource: (resourceId: string) => Promise<void>;
  
  // Tags
  loadTags: (communityId: string) => Promise<void>;
  createTag: (communityId: string, tagData: Partial<ResourceTag>) => Promise<ResourceTag>;
  updateTag: (tagId: string, updates: Partial<ResourceTag>) => Promise<void>;
  deleteTag: (tagId: string) => Promise<void>;
  
  // View controls
  setViewMode: (mode: 'grid' | 'list') => void;
  setSortBy: (sortBy: ResourceState['sortBy']) => void;
  setSortOrder: (order: 'asc' | 'desc') => void;
  setSelectedTags: (tags: string[]) => void;
  setSearchQuery: (query: string) => void;
  
  // Utility functions
  getFilteredResources: (communityId: string) => Resource[];
  getResourcesByTag: (communityId: string, tagId: string) => Resource[];
  searchResources: (communityId: string, query: string) => Resource[];
}

export const useResourceStore = create<ResourceState>((set, get) => ({
  // Initial state
  resources: {},
  tags: {},
  loading: false,
  error: null,
  viewMode: 'grid',
  sortBy: 'uploadedAt',
  sortOrder: 'desc',
  selectedTags: [],
  searchQuery: '',

  // Load resources for a community
  loadResources: async (communityId) => {
    set({ loading: true, error: null });
    try {
      // TODO: Implement Firestore query for community resources
      // const resources = await getCommunityResources(communityId);
      const resources: Resource[] = []; // Placeholder
      
      const { resources: currentResources } = get();
      set({
        resources: {
          ...currentResources,
          [communityId]: resources
        },
        loading: false
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to load resources',
        loading: false 
      });
    }
  },

  // Upload a file resource
  uploadResource: async (communityId, file, metadata) => {
    set({ loading: true, error: null });
    try {
      // TODO: Implement Firebase Storage upload and Firestore document creation
      // const uploadResult = await uploadFileToStorage(file, `communities/${communityId}/resources`);
      // const resource = await createResourceInFirestore(communityId, {
      //   ...metadata,
      //   type: 'file',
      //   url: uploadResult.downloadURL,
      //   fileSize: file.size,
      //   mimeType: file.type
      // });
      
      const resource: Resource = {
        id: `resource_${Date.now()}`,
        communityId,
        name: metadata.name || file.name,
        description: metadata.description,
        type: 'file',
        url: URL.createObjectURL(file), // Temporary URL
        fileSize: file.size,
        mimeType: file.type,
        tags: metadata.tags || [],
        uploadedBy: 'current-user', // TODO: Get from auth store
        uploadedAt: new Date(),
        downloads: 0,
        likes: []
      };
      
      const { resources } = get();
      const communityResources = resources[communityId] || [];
      
      set({
        resources: {
          ...resources,
          [communityId]: [...communityResources, resource]
        },
        loading: false
      });
      
      return resource;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to upload resource',
        loading: false 
      });
      throw error;
    }
  },

  // Create a link resource
  createLinkResource: async (communityId, data) => {
    set({ loading: true, error: null });
    try {
      // TODO: Implement Firestore link resource creation
      // const resource = await createResourceInFirestore(communityId, {
      //   ...data,
      //   type: 'link'
      // });
      
      const resource: Resource = {
        id: `resource_${Date.now()}`,
        communityId,
        name: data.name || 'Untitled Link',
        description: data.description,
        type: 'link',
        url: data.url || '',
        tags: data.tags || [],
        uploadedBy: 'current-user', // TODO: Get from auth store
        uploadedAt: new Date(),
        downloads: 0,
        likes: []
      };
      
      const { resources } = get();
      const communityResources = resources[communityId] || [];
      
      set({
        resources: {
          ...resources,
          [communityId]: [...communityResources, resource]
        },
        loading: false
      });
      
      return resource;
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create link resource',
        loading: false 
      });
      throw error;
    }
  },

  // Update a resource
  updateResource: async (resourceId, updates) => {
    try {
      // TODO: Implement Firestore resource update
      // await updateResourceInFirestore(resourceId, updates);
      
      const { resources } = get();
      
      // Update resource in all communities
      const updatedResources = Object.keys(resources).reduce((acc, communityId) => {
        acc[communityId] = resources[communityId].map(r => 
          r.id === resourceId ? { ...r, ...updates } : r
        );
        return acc;
      }, {} as Record<string, Resource[]>);
      
      set({ resources: updatedResources });
    } catch (error) {
      console.error('Failed to update resource:', error);
    }
  },

  // Delete a resource
  deleteResource: async (resourceId) => {
    try {
      // TODO: Implement Firestore resource deletion and Storage file deletion
      // await deleteResourceFromFirestore(resourceId);
      // await deleteFileFromStorage(resourceUrl);
      
      const { resources } = get();
      
      // Remove resource from all communities
      const updatedResources = Object.keys(resources).reduce((acc, communityId) => {
        acc[communityId] = resources[communityId].filter(r => r.id !== resourceId);
        return acc;
      }, {} as Record<string, Resource[]>);
      
      set({ resources: updatedResources });
    } catch (error) {
      console.error('Failed to delete resource:', error);
    }
  },

  // Download a resource (increment download count)
  downloadResource: async (resourceId) => {
    try {
      // TODO: Implement download tracking
      // await incrementDownloadCount(resourceId);
      
      const { resources } = get();
      
      // Update download count locally
      const updatedResources = Object.keys(resources).reduce((acc, communityId) => {
        acc[communityId] = resources[communityId].map(r => 
          r.id === resourceId ? { ...r, downloads: r.downloads + 1 } : r
        );
        return acc;
      }, {} as Record<string, Resource[]>);
      
      set({ resources: updatedResources });
    } catch (error) {
      console.error('Failed to track download:', error);
    }
  },

  // Like a resource
  likeResource: async (resourceId) => {
    try {
      // TODO: Implement Firestore like addition
      // await addLikeToResource(resourceId);
      
      const { resources } = get();
      const currentUserId = 'current-user'; // TODO: Get from auth store
      
      // Update likes locally
      const updatedResources = Object.keys(resources).reduce((acc, communityId) => {
        acc[communityId] = resources[communityId].map(r => {
          if (r.id === resourceId && !r.likes.includes(currentUserId)) {
            return { ...r, likes: [...r.likes, currentUserId] };
          }
          return r;
        });
        return acc;
      }, {} as Record<string, Resource[]>);
      
      set({ resources: updatedResources });
    } catch (error) {
      console.error('Failed to like resource:', error);
    }
  },

  // Unlike a resource
  unlikeResource: async (resourceId) => {
    try {
      // TODO: Implement Firestore like removal
      // await removeLikeFromResource(resourceId);
      
      const { resources } = get();
      const currentUserId = 'current-user'; // TODO: Get from auth store
      
      // Update likes locally
      const updatedResources = Object.keys(resources).reduce((acc, communityId) => {
        acc[communityId] = resources[communityId].map(r => {
          if (r.id === resourceId) {
            return { ...r, likes: r.likes.filter(uid => uid !== currentUserId) };
          }
          return r;
        });
        return acc;
      }, {} as Record<string, Resource[]>);
      
      set({ resources: updatedResources });
    } catch (error) {
      console.error('Failed to unlike resource:', error);
    }
  },

  // Load tags for a community
  loadTags: async (communityId) => {
    try {
      // TODO: Implement Firestore query for community tags
      // const tags = await getCommunityTags(communityId);
      const tags: ResourceTag[] = []; // Placeholder
      
      const { tags: currentTags } = get();
      set({
        tags: {
          ...currentTags,
          [communityId]: tags
        }
      });
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  },

  // Create a new tag
  createTag: async (communityId, tagData) => {
    try {
      // TODO: Implement Firestore tag creation
      // const tag = await createTagInFirestore(communityId, tagData);
      
      const tag: ResourceTag = {
        id: `tag_${Date.now()}`,
        name: tagData.name || 'Untitled Tag',
        color: tagData.color || '#3B82F6',
        communityId,
        createdBy: 'current-user', // TODO: Get from auth store
        createdAt: new Date()
      };
      
      const { tags } = get();
      const communityTags = tags[communityId] || [];
      
      set({
        tags: {
          ...tags,
          [communityId]: [...communityTags, tag]
        }
      });
      
      return tag;
    } catch (error) {
      console.error('Failed to create tag:', error);
      throw error;
    }
  },

  // Update a tag
  updateTag: async (tagId, updates) => {
    try {
      // TODO: Implement Firestore tag update
      // await updateTagInFirestore(tagId, updates);
      
      const { tags } = get();
      
      // Update tag in all communities
      const updatedTags = Object.keys(tags).reduce((acc, communityId) => {
        acc[communityId] = tags[communityId].map(t => 
          t.id === tagId ? { ...t, ...updates } : t
        );
        return acc;
      }, {} as Record<string, ResourceTag[]>);
      
      set({ tags: updatedTags });
    } catch (error) {
      console.error('Failed to update tag:', error);
    }
  },

  // Delete a tag
  deleteTag: async (tagId) => {
    try {
      // TODO: Implement Firestore tag deletion
      // await deleteTagFromFirestore(tagId);
      
      const { tags } = get();
      
      // Remove tag from all communities
      const updatedTags = Object.keys(tags).reduce((acc, communityId) => {
        acc[communityId] = tags[communityId].filter(t => t.id !== tagId);
        return acc;
      }, {} as Record<string, ResourceTag[]>);
      
      set({ tags: updatedTags });
    } catch (error) {
      console.error('Failed to delete tag:', error);
    }
  },

  // View controls
  setViewMode: (mode) => set({ viewMode: mode }),
  setSortBy: (sortBy) => set({ sortBy }),
  setSortOrder: (order) => set({ sortOrder: order }),
  setSelectedTags: (tags) => set({ selectedTags: tags }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  // Utility functions
  getFilteredResources: (communityId) => {
    const { resources, selectedTags, searchQuery, sortBy, sortOrder } = get();
    let filteredResources = resources[communityId] || [];
    
    // Filter by tags
    if (selectedTags.length > 0) {
      filteredResources = filteredResources.filter(resource =>
        resource.tags.some(tag => selectedTags.includes(tag))
      );
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredResources = filteredResources.filter(resource =>
        resource.name.toLowerCase().includes(query) ||
        resource.description?.toLowerCase().includes(query) ||
        resource.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }
    
    // Sort resources
    filteredResources.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'uploadedAt':
          comparison = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
          break;
        case 'downloads':
          comparison = a.downloads - b.downloads;
          break;
        case 'likes':
          comparison = a.likes.length - b.likes.length;
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return filteredResources;
  },

  getResourcesByTag: (communityId, tagId) => {
    const { resources } = get();
    const communityResources = resources[communityId] || [];
    
    return communityResources.filter(resource =>
      resource.tags.includes(tagId)
    );
  },

  searchResources: (communityId, query) => {
    const { resources } = get();
    const communityResources = resources[communityId] || [];
    
    if (!query) return communityResources;
    
    const searchQuery = query.toLowerCase();
    return communityResources.filter(resource =>
      resource.name.toLowerCase().includes(searchQuery) ||
      resource.description?.toLowerCase().includes(searchQuery) ||
      resource.tags.some(tag => tag.toLowerCase().includes(searchQuery))
    );
  }
}));
