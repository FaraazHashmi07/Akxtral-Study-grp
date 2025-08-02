import { create } from 'zustand';
import { Resource, ResourceTag } from '../types';
import { uploadCommunityResource, UploadProgress, deleteFileFromStorage, validateFile } from '../services/storageService';
import { auth, db } from '../lib/firebase';
import { collection, addDoc, doc, updateDoc, deleteDoc, getDocs, query, where, orderBy, serverTimestamp, getDoc } from 'firebase/firestore';
import { canUploadResources } from '../lib/authorization';

// Helper function to validate upload permissions and community settings
const validateUploadPermissions = async (communityId: string, file: File) => {
  if (!auth.currentUser) {
    throw new Error('You must be logged in to upload files');
  }

  // Validate file first
  const fileValidation = validateFile(file);
  if (!fileValidation.isValid) {
    throw new Error(fileValidation.error || 'Invalid file');
  }

  // Get community settings to check if file uploads are allowed
  try {
    const communityDoc = doc(db, 'communities', communityId);
    const communitySnapshot = await getDoc(communityDoc);

    if (!communitySnapshot.exists()) {
      throw new Error('Community not found');
    }

    const communityData = communitySnapshot.data();
    const settings = communityData.settings;

    // Check if uploads are disabled (default to enabled)
    if (settings?.allowFileUploads === false) {
      throw new Error('File uploads are disabled for this community');
    }

    // Check file size against community limits (default 10MB)
    const maxFileSize = (settings?.maxFileSize || 10) * 1024 * 1024; // Convert MB to bytes
    if (file.size > maxFileSize) {
      const limitMB = settings?.maxFileSize || 10;
      throw new Error(`File size exceeds community limit of ${limitMB}MB`);
    }

    // Check file type against community allowed types (if specified)
    const allowedTypes = settings?.allowedFileTypes || [];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (allowedTypes.length > 0 && fileExtension && !allowedTypes.includes(fileExtension)) {
      throw new Error(`File type .${fileExtension} is not allowed in this community. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // More permissive permission check - just verify user is authenticated
    // Community membership will be validated by Firebase security rules
    console.log('✅ Upload validation passed for user:', auth.currentUser.uid, 'in community:', communityId);

    return true;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to validate community settings');
  }
};

interface ResourceState {
  // State
  resources: Record<string, Resource[]>; // communityId -> resources
  tags: Record<string, ResourceTag[]>; // communityId -> tags
  loading: boolean;
  error: string | null;
  
  // View state
  viewMode: 'grid' | 'list';
  sortBy: 'name' | 'uploadedAt';
  sortOrder: 'asc' | 'desc';
  selectedTags: string[];
  searchQuery: string;
  
  // Actions
  loadResources: (communityId: string) => Promise<void>;
  uploadResource: (communityId: string, file: File, metadata: Partial<Resource>, onProgress?: (progress: UploadProgress) => void) => Promise<Resource>;
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
    console.log('🔄 Loading resources for community:', communityId);
    set({ loading: true, error: null });
    try {
      // Query resources from Firestore
      const resourcesCollection = collection(db, 'resources');

      let resourcesQuery;
      let querySnapshot;

      try {
        // Try with orderBy first (requires composite index)
        resourcesQuery = query(
          resourcesCollection,
          where('communityId', '==', communityId),
          orderBy('uploadedAt', 'desc')
        );
        querySnapshot = await getDocs(resourcesQuery);
      } catch (indexError) {
        console.warn('Composite index not available, falling back to simple query:', indexError);
        // Fallback to simple query without orderBy
        resourcesQuery = query(
          resourcesCollection,
          where('communityId', '==', communityId)
        );
        querySnapshot = await getDocs(resourcesQuery);
      }

      const resources: Resource[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        resources.push({
          id: doc.id,
          communityId: data.communityId,
          name: data.name,
          description: data.description || '',
          type: data.type,
          url: data.url,
          fileSize: data.fileSize,
          mimeType: data.mimeType,
          tags: data.tags || [],
          uploadedBy: data.uploadedBy,
          uploadedAt: data.uploadedAt?.toDate() || new Date(),
          downloads: data.downloads || 0,
          likes: data.likes || []
        });
      });

      // Sort by uploadedAt in JavaScript if we couldn't use orderBy in the query
      resources.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());

      console.log(`✅ Successfully loaded ${resources.length} resources for community ${communityId}`);
      console.log('📋 Resource isolation check:', {
        communityId,
        resourceCount: resources.length,
        resourceIds: resources.map(r => ({ id: r.id, name: r.name, communityId: r.communityId }))
      });

      const { resources: currentResources } = get();
      set({
        resources: {
          ...currentResources,
          [communityId]: resources
        },
        loading: false
      });
    } catch (error) {
      console.error('Failed to load resources:', error);
      set({
        error: error instanceof Error ? error.message : 'Failed to load resources',
        loading: false
      });
    }
  },

  // Upload a file resource
  uploadResource: async (communityId, file, metadata, onProgress) => {
    set({ loading: true, error: null });

    if (!auth.currentUser) {
      const error = 'User must be authenticated to upload files';
      set({ error, loading: false });
      throw new Error(error);
    }

    try {
      // Validate permissions and community settings
      await validateUploadPermissions(communityId, file);
      // Upload file to Firebase Storage
      const uploadResult = await uploadCommunityResource(
        communityId,
        file,
        (progress: UploadProgress) => {
          // Call the progress callback if provided
          if (onProgress) {
            onProgress(progress);
          }
        }
      );

      // Create resource document in Firestore
      const resourceData = {
        communityId,
        name: metadata.name || file.name,
        description: metadata.description || '',
        type: 'file' as const,
        url: uploadResult.downloadURL,
        storagePath: uploadResult.fullPath, // Store the full storage path for deletion
        fileSize: file.size,
        mimeType: file.type,
        tags: metadata.tags || [],
        uploadedBy: auth.currentUser.uid,
        uploadedAt: serverTimestamp(),
        downloads: 0,
        likes: []
      };

      const resourcesCollection = collection(db, 'resources');
      const docRef = await addDoc(resourcesCollection, resourceData);

      // Create the resource object for local state
      const resource: Resource = {
        id: docRef.id,
        communityId,
        name: metadata.name || file.name,
        description: metadata.description || '',
        type: 'file',
        url: uploadResult.downloadURL,
        fileSize: file.size,
        mimeType: file.type,
        tags: metadata.tags || [],
        uploadedBy: auth.currentUser.uid,
        uploadedAt: new Date(),
        downloads: 0,
        likes: []
      };

      // Update local state
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
      console.error('Failed to upload resource:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload resource';
      set({
        error: errorMessage,
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
    if (!auth.currentUser) {
      throw new Error('User must be authenticated to delete resources');
    }

    try {
      // Get resource document to find the file path
      const resourceDoc = doc(db, 'resources', resourceId);
      const resourceSnapshot = await getDoc(resourceDoc);

      if (!resourceSnapshot.exists()) {
        throw new Error('Resource not found');
      }

      const resourceData = resourceSnapshot.data();

      // Check if user has permission to delete (must be the uploader or community admin)
      const isOwner = resourceData.uploadedBy === auth.currentUser.uid;
      
      // Import authorization functions dynamically to avoid circular imports
      const { canBulkManageResources } = await import('../lib/authorization');
      const { useAuthStore } = await import('./authStore');
      
      const authStore = useAuthStore.getState();
      const canManage = authStore.user && canBulkManageResources(authStore.user, resourceData.communityId);
      
      if (!isOwner && !canManage) {
        throw new Error('You do not have permission to delete this resource');
      }

      // Delete file from Storage if it's a file resource
      if (resourceData.type === 'file' && resourceData.url) {
        try {
          let storagePath: string | undefined;
          
          // Use stored storage path if available (new resources)
          if (resourceData.storagePath) {
            storagePath = resourceData.storagePath;
          } else {
            // Fallback for old resources without storagePath
            // Try to extract from URL and decode properly
            const urlParts = resourceData.url.split('/o/');
            if (urlParts.length > 1) {
              const encodedPath = urlParts[1].split('?')[0];
              storagePath = decodeURIComponent(encodedPath);
            }
          }
          
          if (storagePath) {
            await deleteFileFromStorage(storagePath);
          }
        } catch (storageError) {
          console.warn('Failed to delete file from storage:', storageError);
          // Continue with Firestore deletion even if storage deletion fails
        }
      }

      // Delete resource document from Firestore
      await deleteDoc(resourceDoc);

      // Update local state
      const { resources } = get();
      const updatedResources = Object.keys(resources).reduce((acc, communityId) => {
        acc[communityId] = resources[communityId].filter(r => r.id !== resourceId);
        return acc;
      }, {} as Record<string, Resource[]>);

      set({ resources: updatedResources });
    } catch (error) {
      console.error('Failed to delete resource:', error);
      throw error;
    }
  },

  // Download a resource (increment download count)
  downloadResource: async (resourceId) => {
    try {
      // Update download count in Firestore
      const resourceDoc = doc(db, 'resources', resourceId);
      const resourceSnapshot = await getDoc(resourceDoc);

      if (resourceSnapshot.exists()) {
        const currentDownloads = resourceSnapshot.data().downloads || 0;
        await updateDoc(resourceDoc, {
          downloads: currentDownloads + 1
        });
      }

      // Update download count locally
      const { resources } = get();
      const updatedResources = Object.keys(resources).reduce((acc, communityId) => {
        acc[communityId] = resources[communityId].map(r =>
          r.id === resourceId ? { ...r, downloads: r.downloads + 1 } : r
        );
        return acc;
      }, {} as Record<string, Resource[]>);

      set({ resources: updatedResources });
    } catch (error) {
      console.error('Failed to track download:', error);
      // Don't throw error for download tracking failure
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
