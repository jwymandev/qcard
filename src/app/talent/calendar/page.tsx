'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Calendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay, parseISO } from 'date-fns';
import { Spinner, Alert, AlertTitle, AlertDescription, Button } from '@/components/ui';

// Import calendar styles in your own CSS file
import 'react-big-calendar/lib/css/react-big-calendar.css';

type CalendarEvent = {
  id: string;
  title: string;
  type: 'project' | 'scene';
  start: Date;
  end: Date;
  studio: string;
  role?: string;
  status: string;
  allDay: boolean;
  projectId?: string;
  projectTitle?: string;
  notes?: string;
  location?: {
    name: string;
  };
};

export default function TalentCalendarPage() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [view, setView] = useState('month');
  const [date, setDate] = useState(new Date());
  const [selectedEvents, setSelectedEvents] = useState<CalendarEvent[]>([]);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  
  // Set up the localizer for the calendar
  const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales: {
      'en-US': require('date-fns/locale/en-US')
    }
  });
  
  useEffect(() => {
    if (authStatus === 'authenticated') {
      fetchCalendarEvents();
    } else if (authStatus === 'unauthenticated') {
      router.push('/sign-in');
    }
  }, [authStatus, router, fetchCalendarEvents]);
  
  const fetchCalendarEvents = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/talent/calendar');

      if (response.ok) {
        const data = await response.json();

        // Parse dates into Date objects
        const formattedEvents = data.map((event: any) => ({
          ...event,
          start: new Date(event.start),
          end: new Date(event.end || event.start),
        }));

        setEvents(formattedEvents);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load calendar events');
      }
    } catch (err) {
      console.error('Error fetching calendar events:', err);
      setError('Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  }, []);
  
  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };
  
  const handleSelectSlot = ({ start, end }: { start: Date; end: Date }) => {
    // Find events that overlap with the selected time slot
    const overlappingEvents = events.filter(event => {
      return (
        (event.start >= start && event.start <= end) ||
        (event.end >= start && event.end <= end) ||
        (event.start <= start && event.end >= end)
      );
    });
    
    setSelectedEvents(overlappingEvents);
    
    if (overlappingEvents.length > 0) {
      setExportModalOpen(true);
    }
  };
  
  const handleExportCalendar = async () => {
    try {
      if (selectedEvents.length === 0) return;
      
      const response = await fetch('/api/talent/calendar/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          events: selectedEvents,
        }),
      });
      
      if (response.ok) {
        // Get the ICS file as a blob
        const blob = await response.blob();
        
        // Create a link element and trigger download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'qcard-calendar.ics';
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Close the modal
        setExportModalOpen(false);
        setSelectedEvents([]);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to export calendar');
      }
    } catch (err) {
      console.error('Error exporting calendar:', err);
      setError('Failed to export calendar');
    }
  };

  // Export to Google Calendar
  const handleGoogleCalendarExport = () => {
    if (selectedEvents.length === 0) return;

    const formatDate = (date: Date) => {
      return date.toISOString().replace(/-|:|\.\d+/g, '');
    };

    if (selectedEvents.length === 1) {
      // Single event export - direct to Google Calendar
      const event = selectedEvents[0];
      const googleUrl = new URL('https://www.google.com/calendar/render?action=TEMPLATE');

      // Set event title
      googleUrl.searchParams.append('text', `${event.title} ${event.type === 'scene' ? `(${event.projectTitle})` : ''}`);

      // Set dates
      googleUrl.searchParams.append('dates', `${formatDate(event.start)}/${formatDate(event.end)}`);

      // Set details
      let details = `Role: ${event.role}\n`;
      if (event.studio) details += `Studio: ${event.studio}\n`;
      if (event.notes) details += `Notes: ${event.notes}\n`;
      if (event.type === 'scene' && event.projectTitle) {
        details += `Project: ${event.projectTitle}\n`;
      }
      googleUrl.searchParams.append('details', details);

      // Set location
      if (event.location) {
        googleUrl.searchParams.append('location', event.location.name);
      }

      // Open in a new tab
      window.open(googleUrl.toString(), '_blank');
    } else {
      // Multiple events - use our ICS export and guide the user to import to Google Calendar
      handleExportCalendar().then(() => {
        // Show instructions toast/alert for importing to Google
        setError(null); // Clear any existing errors
        const instructionsAlert = document.createElement('div');
        instructionsAlert.className = 'fixed bottom-4 right-4 bg-blue-100 text-blue-800 p-4 rounded-md shadow-lg max-w-md';
        // Create a safer approach using DOM methods instead of innerHTML
        const alertDiv = document.createElement('div');
        alertDiv.className = 'flex justify-between items-start';

        const contentDiv = document.createElement('div');

        const heading = document.createElement('h3');
        heading.className = 'font-bold mb-2';
        heading.textContent = 'Import to Google Calendar';
        contentDiv.appendChild(heading);

        const intro = document.createElement('p');
        intro.className = 'text-sm';
        intro.textContent = 'To import multiple events to Google Calendar:';
        contentDiv.appendChild(intro);

        const list = document.createElement('ol');
        list.className = 'text-sm list-decimal pl-4 mt-2';

        const steps = [
          { text: 'Open ', link: 'https://calendar.google.com', linkText: 'Google Calendar' },
          { text: 'Click the gear icon (Settings)' },
          { text: 'Select "Import & Export"' },
          { text: 'Upload the downloaded .ics file' }
        ];

        steps.forEach(step => {
          const li = document.createElement('li');

          if (step.link) {
            const textNode = document.createTextNode(step.text);
            li.appendChild(textNode);

            const link = document.createElement('a');
            link.href = step.link;
            link.target = '_blank';
            link.className = 'underline';
            link.textContent = step.linkText;
            li.appendChild(link);
          } else {
            li.textContent = step.text;
          }

          list.appendChild(li);
        });

        contentDiv.appendChild(list);
        alertDiv.appendChild(contentDiv);

        const closeButton = document.createElement('button');
        closeButton.className = 'text-blue-800 hover:text-blue-600';
        closeButton.textContent = '✕';
        alertDiv.appendChild(closeButton);

        instructionsAlert.appendChild(alertDiv);

        // Now we can safely append the element
        document.body.appendChild(instructionsAlert);

        // Add click event to close button
        closeButton.addEventListener('click', () => {
          document.body.removeChild(instructionsAlert);
        });

        // Auto-remove after 20 seconds
        setTimeout(() => {
          if (document.body.contains(instructionsAlert)) {
            document.body.removeChild(instructionsAlert);
          }
        }, 20000);
      });
    }

    // Close the modal
    setExportModalOpen(false);
  };
  
  // Export to Apple Calendar (iCal)
  const handleAppleCalendarExport = async () => {
    // Use the same ICS export functionality
    await handleExportCalendar();
  };
  
  // Custom event component for the calendar
  const eventStyleGetter = (event: CalendarEvent) => {
    let backgroundColor = '#3788d8';
    let borderColor = '#2c6cb0';
    
    switch (event.type) {
      case 'project':
        backgroundColor = '#34d399';
        borderColor = '#059669';
        break;
      case 'scene':
        backgroundColor = '#f87171';
        borderColor = '#ef4444';
        break;
    }
    
    // Different styles based on status
    if (event.status === 'COMPLETED') {
      backgroundColor = '#cbd5e1';
      borderColor = '#94a3b8';
    } else if (event.status === 'CANCELLED') {
      backgroundColor = '#f43f5e';
      borderColor = '#e11d48';
    }
    
    return {
      style: {
        backgroundColor,
        borderColor,
        borderRadius: '4px',
        opacity: 0.8,
        color: '#fff',
        border: 'none',
        display: 'block',
      },
    };
  };
  
  // Format the calendar event titles
  const eventPropGetter = (event: CalendarEvent) => {
    return {
      title: `${event.title} - ${event.role || 'Talent'}`,
    };
  };
  
  if (authStatus === 'loading' || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Spinner />
        <span className="ml-2">Loading calendar...</span>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Calendar</h1>
        <div className="flex space-x-2">
          <Link
            href="/talent/projects"
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
          >
            View Projects
          </Link>
          <Button
            onClick={() => {
              setSelectedEvents(events);
              setExportModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Export Calendar
          </Button>
        </div>
      </div>
      
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-wrap mb-4 text-sm">
          <div className="flex items-center mr-4">
            <div className="w-3 h-3 bg-[#34d399] rounded-full mr-1"></div>
            <span>Project Timeline</span>
          </div>
          <div className="flex items-center mr-4">
            <div className="w-3 h-3 bg-[#f87171] rounded-full mr-1"></div>
            <span>Scene Shoot Date</span>
          </div>
          <div className="flex items-center mr-4">
            <div className="w-3 h-3 bg-[#cbd5e1] rounded-full mr-1"></div>
            <span>Completed</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-[#f43f5e] rounded-full mr-1"></div>
            <span>Cancelled</span>
          </div>
        </div>
        
        <div className="h-[600px]">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            selectable
            eventPropGetter={eventStyleGetter}
            tooltipAccessor={event => `${event.title} - ${event.role || 'Talent'}`}
            views={['month', 'week', 'day']}
            onView={(view) => setView(view)}
            onNavigate={(date) => setDate(date)}
          />
        </div>
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">{selectedEvent.title}</h2>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-1">
                {format(selectedEvent.start, 'PPP')}
                {!selectedEvent.allDay && ` at ${format(selectedEvent.start, 'p')}`}
                {selectedEvent.start.toDateString() !== selectedEvent.end.toDateString() && (
                  ` to ${format(selectedEvent.end, 'PPP')}`
                )}
                {!selectedEvent.allDay && selectedEvent.start.toDateString() === selectedEvent.end.toDateString() && (
                  ` - ${format(selectedEvent.end, 'p')}`
                )}
              </p>
              
              <div className="grid grid-cols-2 gap-2 mt-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Type</p>
                  <p className="text-sm">
                    {selectedEvent.type === 'project' ? 'Project Timeline' : 'Scene Shoot Date'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Role</p>
                  <p className="text-sm">{selectedEvent.role || 'Talent'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Studio</p>
                  <p className="text-sm">{selectedEvent.studio}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <p className="text-sm capitalize">{selectedEvent.status.toLowerCase()}</p>
                </div>
                {selectedEvent.type === 'scene' && selectedEvent.projectTitle && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Project</p>
                    <p className="text-sm">{selectedEvent.projectTitle}</p>
                  </div>
                )}
                {selectedEvent.location && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Location</p>
                    <p className="text-sm">{selectedEvent.location.name}</p>
                  </div>
                )}
                {selectedEvent.type === 'scene' && !selectedEvent.allDay && (
                  <div className="col-span-2 mt-2 bg-yellow-50 p-2 rounded text-sm">
                    <p className="font-medium text-gray-700">
                      Duration: {Math.round((selectedEvent.end.getTime() - selectedEvent.start.getTime()) / (1000 * 60))} minutes
                    </p>
                  </div>
                )}
              </div>
              
              {selectedEvent.notes && (
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-500">Notes</p>
                  <p className="text-sm mt-1">{selectedEvent.notes}</p>
                </div>
              )}
            </div>
            
            <div className="flex justify-between">
              <Button
                onClick={() => {
                  setSelectedEvents([selectedEvent]);
                  setSelectedEvent(null);
                  setExportModalOpen(true);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Export Event
              </Button>
              
              {selectedEvent.type === 'scene' && selectedEvent.projectId && (
                <Link
                  href={`/talent/projects/${selectedEvent.projectId}`}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
                >
                  View Project
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Export Modal */}
      {exportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-bold">Export Calendar</h2>
              <button
                onClick={() => {
                  setExportModalOpen(false);
                  setSelectedEvents([]);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <p className="mb-4 text-sm text-gray-600">
              {selectedEvents.length === 1 
                ? "Export this event to your personal calendar."
                : `Export ${selectedEvents.length} events to your personal calendar.`}
            </p>
            
            <div className="flex flex-col space-y-3">
              <button
                onClick={handleExportCalendar}
                className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
              >
                <span className="mr-2">📅</span>
                Download .ics File (Apple Calendar, Outlook)
              </button>
              
              <button
                onClick={handleGoogleCalendarExport}
                className="flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none"
              >
                <span className="mr-2">🗓️</span>
                {selectedEvents.length === 1 ? 'Add to Google Calendar' : 'Export to Google Calendar'}
              </button>
            </div>

            <div className="mt-6 text-xs text-gray-500">
              <p>
                Note: Direct Google Calendar export opens a new browser tab for single events.
                For multiple events, you&apos;ll download an .ics file with instructions for importing.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}