import React from 'react';
import { X, Calendar, Clock, MapPin, Link, Plus } from 'lucide-react';
import { Event } from '../../types';
import { format } from 'date-fns';
import { isCommunityAdmin } from '../../lib/authorization';
import { useAuthStore } from '../../store/authStore';
import { useCommunityStore } from '../../store/communityStore';

interface EventSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date | null;
  events: Event[];
  communityId: string;
  onEventSelect: (event: Event) => void;
  onCreateEvent: (date: Date) => void;
}

const EventSidebar: React.FC<EventSidebarProps> = ({
  isOpen,
  onClose,
  selectedDate,
  events,
  communityId,
  onEventSelect,
  onCreateEvent
}) => {
  const { user } = useAuthStore();
  const { communities } = useCommunityStore();
  
  const community = communities.find(c => c.id === communityId);
  const isAdmin = user && community ? isCommunityAdmin(user.uid, community) : false;

  if (!isOpen || !selectedDate) return null;

  const sortedEvents = events.sort((a, b) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-lg border-l z-40 transform transition-transform duration-300">
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {format(selectedDate, 'EEEE, MMMM d')}
            </h3>
            <p className="text-sm text-gray-500">
              {events.length} {events.length === 1 ? 'event' : 'events'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* New Event Button */}
        {isAdmin && (
          <div className="p-4 border-b">
            <button
              onClick={() => onCreateEvent(selectedDate)}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>New Event</span>
            </button>
          </div>
        )}

        {/* Events List */}
        <div className="flex-1 overflow-y-auto">
          {sortedEvents.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">No events scheduled for this day</p>
              {isAdmin && (
                <button
                  onClick={() => onCreateEvent(selectedDate)}
                  className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Create the first event
                </button>
              )}
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {sortedEvents.map(event => (
                <div
                  key={event.id}
                  onClick={() => onEventSelect(event)}
                  className="p-3 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-medium text-gray-900 flex-1 pr-2">
                      {event.title}
                    </h4>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Clock className="w-3 h-3" />
                      <span>{format(event.startTime, 'h:mm a')}</span>
                    </div>
                    
                    {event.location && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <MapPin className="w-3 h-3" />
                        <span className="truncate">{event.location}</span>
                      </div>
                    )}
                    
                    {event.meetingLink && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Link className="w-3 h-3" />
                        <span className="text-blue-600">Meeting link available</span>
                      </div>
                    )}
                    
                    {event.description && (
                      <p className="text-sm text-gray-600 line-clamp-2 mt-2">
                        {event.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100">
                    <span className="text-xs text-gray-500">
                      by {event.createdByName}
                    </span>
                    <span className="text-xs text-blue-600 font-medium">
                      View details →
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventSidebar;