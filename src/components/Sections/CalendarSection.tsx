import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';
import { useCommunityStore } from '../../store/communityStore';
import { useAuthStore } from '../../store/authStore';
import { isCommunityAdmin } from '../../lib/authorization';
import { Event } from '../../types';
import CalendarView from '../Calendar/CalendarView';
import EventModal from '../Calendar/EventModal';
import EventSidebar from '../Calendar/EventSidebar';

export const CalendarSection: React.FC = () => {
  const { activeCommunity } = useCommunityStore();
  const { user } = useAuthStore();
  
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showEventSidebar, setShowEventSidebar] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view'>('create');
  const [initialDate, setInitialDate] = useState<Date | undefined>(undefined);
  
  if (!activeCommunity) return null;
  
  const isAdmin = user ? isCommunityAdmin(user, activeCommunity.id) : false;

  const handleDateSelect = (date: Date, events: Event[]) => {
    setSelectedDate(date);
    setSelectedEvents(events);
    setShowEventSidebar(true);
  };

  const handleEventSelect = (event: Event) => {
    setSelectedEvent(event);
    setModalMode('view');
    setShowEventModal(true);
  };

  const handleCreateEvent = (date?: Date) => {
    setSelectedEvent(null);
    setInitialDate(date || new Date());
    setModalMode('create');
    setShowEventModal(true);
  };

  const handleEditEvent = () => {
    setModalMode('edit');
  };

  const handleCloseModal = () => {
    setShowEventModal(false);
    setSelectedEvent(null);
    setInitialDate(undefined);
  };

  const handleCloseSidebar = () => {
    setShowEventSidebar(false);
    setSelectedDate(null);
    setSelectedEvents([]);
  };

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Calendar
          </h1>
          
          {isAdmin && (
            <button 
              onClick={() => handleCreateEvent()}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus size={20} />
              <span>New Event</span>
            </button>
          )}
        </div>

        {/* Calendar View */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <CalendarView
            communityId={activeCommunity.id}
            onDateSelect={handleDateSelect}
            onEventSelect={handleEventSelect}
          />
        </motion.div>

        {/* Event Modal */}
        <EventModal
          isOpen={showEventModal}
          onClose={handleCloseModal}
          event={selectedEvent}
          communityId={activeCommunity.id}
          initialDate={initialDate}
          mode={modalMode}
          onEdit={handleEditEvent}
        />

        {/* Event Sidebar */}
        <EventSidebar
          isOpen={showEventSidebar}
          onClose={handleCloseSidebar}
          selectedDate={selectedDate}
          events={selectedEvents}
          communityId={activeCommunity.id}
          onEventSelect={handleEventSelect}
          onCreateEvent={handleCreateEvent}
        />
      </div>
    </div>
  );
};
