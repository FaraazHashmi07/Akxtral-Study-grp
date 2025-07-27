import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Link, User, Trash2, Edit } from 'lucide-react';
import { Event } from '../../types';
import { format } from 'date-fns';
import { useEventStore } from '../../store/eventStore';
import { isCommunityAdmin } from '../../lib/authorization';
import { useAuthStore } from '../../store/authStore';
import { useCommunityStore } from '../../store/communityStore';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  event?: Event | null;
  communityId: string;
  initialDate?: Date;
  mode: 'create' | 'edit' | 'view';
  onEdit?: () => void;
  onDelete?: () => void;
}

const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  event,
  communityId,
  initialDate,
  mode,
  onEdit,
  onDelete
}) => {
  const { user } = useAuthStore();
  const { communities } = useCommunityStore();
  const { createEvent, updateEvent, deleteEvent, loading } = useEventStore();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    location: '',
    meetingLink: ''
  });
  
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const community = communities.find(c => c.id === communityId);
  const isAdmin = user ? isCommunityAdmin(user, communityId) : false;
  const canEdit = (mode === 'create' && isAdmin) || (mode === 'edit' && isAdmin);
  const canDelete = isAdmin && mode === 'view' && event;

  useEffect(() => {
    if (event && (mode === 'edit' || mode === 'view')) {
      setFormData({
        title: event.title,
        description: event.description || '',
        startTime: format(event.startTime, "yyyy-MM-dd'T'HH:mm"),
        location: event.location || '',
        meetingLink: event.meetingLink || ''
      });
    } else if (mode === 'create' && initialDate) {
      const defaultTime = new Date(initialDate);
      defaultTime.setHours(9, 0, 0, 0); // Default to 9 AM
      
      setFormData({
        title: '',
        description: '',
        startTime: format(defaultTime, "yyyy-MM-dd'T'HH:mm"),
        location: '',
        meetingLink: ''
      });
    }
  }, [event, mode, initialDate]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    
    if (!formData.startTime) {
      newErrors.startTime = 'Date and time are required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      const eventData: any = {
        title: formData.title.trim(),
        startTime: new Date(formData.startTime)
      };
      
      // Only add optional fields if they have values
      if (formData.description.trim()) {
        eventData.description = formData.description.trim();
      }
      if (formData.location.trim()) {
        eventData.location = formData.location.trim();
      }
      if (formData.meetingLink.trim()) {
        eventData.meetingLink = formData.meetingLink.trim();
      }
      
      if (mode === 'create') {
        await createEvent(communityId, eventData);
      } else if (mode === 'edit' && event) {
        await updateEvent(communityId, event.id, eventData);
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving event:', error);
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    
    try {
      await deleteEvent(communityId, event.id);
      setShowDeleteConfirm(false);
      onClose();
      if (onDelete) onDelete();
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold">
            {mode === 'create' ? 'New Event' : mode === 'edit' ? 'Edit Event' : 'Event Details'}
          </h2>
          <div className="flex items-center space-x-2">
            {mode === 'view' && isAdmin && (
              <>
                <button
                  onClick={onEdit}
                  className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {mode === 'view' ? (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{event?.title}</h3>
              </div>
              
              <div className="flex items-center space-x-2 text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>{event && format(event.startTime, 'EEEE, MMMM d, yyyy')}</span>
              </div>
              
              <div className="flex items-center space-x-2 text-gray-600">
                <Clock className="w-4 h-4" />
                <span>{event && format(event.startTime, 'h:mm a')}</span>
              </div>
              
              {event?.location && (
                <div className="flex items-center space-x-2 text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>{event.location}</span>
                </div>
              )}
              
              {event?.meetingLink && (
                <div className="flex items-center space-x-2 text-gray-600">
                  <Link className="w-4 h-4" />
                  <a 
                    href={event.meetingLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Join Meeting
                  </a>
                </div>
              )}
              
              {event?.description && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Description</h4>
                  <p className="text-gray-600 whitespace-pre-wrap">{event.description}</p>
                </div>
              )}
              
              <div className="flex items-center space-x-2 text-sm text-gray-500 pt-4 border-t">
                <User className="w-4 h-4" />
                <span>Created by {event?.createdByName}</span>
                <span>•</span>
                <span>{event && format(event.createdAt, 'MMM d, yyyy')}</span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.title ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter event title"
                  disabled={!canEdit}
                />
                {errors.title && (
                  <p className="text-red-500 text-sm mt-1">{errors.title}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date & Time *
                </label>
                <input
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) => handleInputChange('startTime', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors.startTime ? 'border-red-500' : 'border-gray-300'
                  }`}
                  disabled={!canEdit}
                />
                {errors.startTime && (
                  <p className="text-red-500 text-sm mt-1">{errors.startTime}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter event description (optional)"
                  disabled={!canEdit}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter location (optional)"
                  disabled={!canEdit}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meeting Link
                </label>
                <input
                  type="url"
                  value={formData.meetingLink}
                  onChange={(e) => handleInputChange('meetingLink', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter meeting link (optional)"
                  disabled={!canEdit}
                />
              </div>
              
              {canEdit && (
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {loading ? 'Saving...' : mode === 'create' ? 'Create Event' : 'Save Changes'}
                  </button>
                </div>
              )}
            </form>
          )}
        </div>
      </div>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Event</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete "{event?.title}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventModal;