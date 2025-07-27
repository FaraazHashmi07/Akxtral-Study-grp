import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEventStore } from '../../store/eventStore';
import { Event } from '../../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';

interface CalendarViewProps {
  communityId: string;
  onDateSelect: (date: Date, events: Event[]) => void;
  onEventSelect: (event: Event) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ 
  communityId, 
  onDateSelect, 
  onEventSelect 
}) => {
  const {
    events,
    selectedDate,
    setSelectedDate,
    goToToday,
    getEventsForDateLocal,
    subscribeToEvents,
    unsubscribeFromEvents
  } = useEventStore();

  const [currentDate, setCurrentDate] = useState(new Date());
  const communityEvents = events[communityId] || [];

  useEffect(() => {
    // Subscribe to events for the current month
    const startDate = startOfMonth(currentDate);
    const endDate = endOfMonth(currentDate);
    
    subscribeToEvents(communityId, startDate, endDate);

    return () => {
      unsubscribeFromEvents(communityId);
    };
  }, [communityId, currentDate, subscribeToEvents, unsubscribeFromEvents]);

  const handlePrevious = () => {
    setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNext = () => {
    setCurrentDate(addMonths(currentDate, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
    goToToday();
  };

  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    const dayEvents = getEventsForDateLocal(date, communityId);
    onDateSelect(date, dayEvents);
  };

  const getDaysToRender = () => {
    const start = startOfWeek(startOfMonth(currentDate));
    const end = endOfWeek(endOfMonth(currentDate));
    return eachDayOfInterval({ start, end });
  };

  const hasEvents = (date: Date) => {
    return getEventsForDateLocal(date, communityId).length > 0;
  };

  const getEventCount = (date: Date) => {
    return getEventsForDateLocal(date, communityId).length;
  };

  const renderCalendarHeader = () => (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 space-y-4 sm:space-y-0">
      <div className="flex items-center space-x-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          {format(currentDate, 'MMMM yyyy')}
        </h2>
        <div className="flex items-center space-x-2">
          <button
            onClick={handlePrevious}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-600 dark:text-gray-300"
            title="Previous month"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleNext}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-600 dark:text-gray-300"
            title="Next month"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <button
            onClick={handleToday}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Today
          </button>
        </div>
      </div>
      

    </div>
  );

  const renderMonthView = () => {
    const days = getDaysToRender();
    const weekDays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        {/* Week day headers */}
        <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
          {weekDays.map(day => (
            <div key={day} className="p-3 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
              <span className="hidden sm:inline">{day}</span>
              <span className="sm:hidden">{day.slice(0, 3)}</span>
            </div>
          ))}
        </div>
        
        {/* Calendar grid */}
        <div className="grid grid-cols-7">
          {days.map((day, index) => {
            const dayEvents = getEventsForDateLocal(day, communityId);
            const isCurrentMonth = day.getMonth() === currentDate.getMonth();
            const isSelected = isSameDay(day, selectedDate);
            const isTodayDate = isToday(day);
            
            return (
              <div
                key={day.toISOString()}
                className={`min-h-[120px] p-2 border-r border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                  !isCurrentMonth ? 'bg-gray-50 dark:bg-gray-900 text-gray-400 dark:text-gray-600' : 'text-gray-900 dark:text-gray-100'
                } ${
                  isSelected ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700' : ''
                }`}
                onClick={() => handleDateClick(day)}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-sm font-medium ${
                    isTodayDate ? 'bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center' : ''
                  }`}>
                    {format(day, 'd')}
                  </span>
                  {hasEvents(day) && (
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      <span className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                        {getEventCount(day)}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Event previews */}
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((event, eventIndex) => (
                    <div
                      key={`${event.id}-${day.toISOString()}-${eventIndex}`}
                      className="text-xs p-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded truncate cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventSelect(event);
                      }}
                    >
                      {format(event.startTime, 'HH:mm')} {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      +{dayEvents.length - 3} more events
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };



  return (
    <div className="space-y-6">
      {renderCalendarHeader()}
      {renderMonthView()}
    </div>
  );
};

export default CalendarView;