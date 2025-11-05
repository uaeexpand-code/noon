
import React, { useState, useMemo, useEffect } from 'react';
import { Calendar } from './components/Calendar';
import { EventModal } from './components/EventModal';
import { Header } from './components/Header';
import { SettingsModal } from './components/SettingsModal';
import { type UserEvent, type SpecialDate, type CalendarEvent } from './types';
import { getSpecialDates } from './services/uaeDatesService';
import { discoverEventsForMonth } from './services/geminiService';
import { sendDiscordWebhook } from './services/discordService';


const App: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'year'>('month');
  const [userEvents, setUserEvents] = useState<UserEvent[]>([]);
  const [discoveredEvents, setDiscoveredEvents] = useState<SpecialDate[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingEvent, setEditingEvent] = useState<UserEvent | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState('');
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isSendingSummary, setIsSendingSummary] = useState(false);


  useEffect(() => {
    const savedWebhookUrl = localStorage.getItem('discordWebhookUrl');
    if (savedWebhookUrl) {
      setDiscordWebhookUrl(savedWebhookUrl);
    }
  }, []);

  const specialDates = useMemo(
    () => getSpecialDates(currentDate.getFullYear()),
    [currentDate]
  );

  const allEvents: CalendarEvent[] = useMemo(() => {
    const combined: CalendarEvent[] = [
      ...specialDates.map(d => ({ ...d, type: 'special' as const })),
      ...userEvents.map(e => ({ ...e, type: 'user' as const })),
      ...discoveredEvents.map(d => ({...d, type: 'discovered' as const})),
    ];
    return combined.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [specialDates, userEvents, discoveredEvents]);
  

  const handleDateSelect = (date: Date, event?: UserEvent) => {
    setSelectedDate(date);
    if(event) {
      setEditingEvent(event);
    } else {
      setEditingEvent(null);
    }
  };

  const closeModal = () => {
    setSelectedDate(null);
    setEditingEvent(null);
  };

  const addOrUpdateEvent = (event: Omit<UserEvent, 'id'>) => {
    if (editingEvent) {
      setUserEvents(prev => prev.map(e => e.id === editingEvent.id ? { ...editingEvent, ...event } : e));
    } else {
      setUserEvents(prev => [...prev, { ...event, id: Date.now().toString() }]);
    }
    closeModal();
  };

  const deleteEvent = (eventId: string) => {
    setUserEvents(prev => prev.filter(e => e.id !== eventId));
    closeModal();
  };

  const handleSaveSettings = (webhookUrl: string) => {
    setDiscordWebhookUrl(webhookUrl);
    localStorage.setItem('discordWebhookUrl', webhookUrl);
    setIsSettingsOpen(false);
  };

  const handleDiscoverEvents = async () => {
    setIsDiscovering(true);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    try {
      const newEvents = await discoverEventsForMonth(year, month);
      
      const existingEventKeys = new Set(allEvents.map(e => `${(e.type === 'user' ? e.title : e.name)}_${e.date.toDateString()}`));
      const uniqueNewEvents = newEvents.filter(newEvent => !existingEventKeys.has(`${newEvent.name}_${newEvent.date.toDateString()}`));

      setDiscoveredEvents(prev => [...prev, ...uniqueNewEvents]);
    } catch (error) {
      console.error("Failed to discover events:", error);
    } finally {
      setIsDiscovering(false);
    }
  };

  const handleSendSummary = async () => {
    if (!discordWebhookUrl) {
      alert("Please set your Discord Webhook URL in settings first.");
      return;
    }
     if (viewMode === 'year') {
        alert("Summary can only be sent for Week or Month view.");
        return;
    }

    setIsSendingSummary(true);

    let summaryEvents: CalendarEvent[] = [];
    let title = '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (viewMode === 'week') {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      startOfWeek.setHours(0,0,0,0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23,59,59,999);
      
      title = `🗓️ Weekly Summary: ${startOfWeek.toLocaleDateString('en-CA')} - ${endOfWeek.toLocaleDateString('en-CA')}`;
      summaryEvents = allEvents.filter(e => e.date >= startOfWeek && e.date <= endOfWeek);
    } else { // 'month'
      title = `🗓️ Monthly Summary for ${currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`;
      summaryEvents = allEvents.filter(e => e.date.getMonth() === currentDate.getMonth() && e.date.getFullYear() === currentDate.getFullYear());
    }

    const upcomingEvents = summaryEvents
      .filter(e => e.date >= today)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    let payload;

    if (upcomingEvents.length === 0) {
      payload = {
        embeds: [{
          title,
          description: "✅ No upcoming events found for this period.",
          color: 0x57F287, // Discord Green
          footer: { text: "Sent from UAE Seller's Smart Calendar" },
        }]
      };
    } else {
      const description = upcomingEvents
        .slice(0, 25) // Discord embed description has a char limit, 25 fields are also a limit. Cap events for safety.
        .map(event => {
          const eventName = event.type === 'user' ? event.title : event.name;
          const dateString = event.date.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' });
          return `**\`${dateString}\`**: ${eventName}`;
        })
        .join('\n');
      
      payload = {
        embeds: [{
          title,
          description,
          color: 0x3498DB, // Discord Blue
          footer: { text: "Sent from UAE Seller's Smart Calendar" },
          timestamp: new Date().toISOString(),
        }]
      };
    }

    try {
      await sendDiscordWebhook(discordWebhookUrl, payload);
    } catch (error) {
      console.error("Failed to send summary:", error);
      alert("Failed to send summary to Discord. Please check your webhook URL and console for errors.");
    } finally {
      setIsSendingSummary(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto">
        <Header 
          currentDate={currentDate} 
          setCurrentDate={setCurrentDate} 
          onOpenSettings={() => setIsSettingsOpen(true)}
          onDiscoverEvents={handleDiscoverEvents}
          isDiscovering={isDiscovering}
          viewMode={viewMode}
          setViewMode={setViewMode}
          onSendSummary={handleSendSummary}
          isSendingSummary={isSendingSummary}
          discordWebhookUrl={discordWebhookUrl}
        />
        <main>
          <Calendar 
            viewMode={viewMode}
            currentDate={currentDate} 
            events={allEvents}
            onDateSelect={handleDateSelect}
            setCurrentDate={setCurrentDate}
            setViewMode={setViewMode}
          />
        </main>
      </div>
      {selectedDate && (
        <EventModal
          isOpen={!!selectedDate}
          onClose={closeModal}
          date={selectedDate}
          event={editingEvent}
          onSave={addOrUpdateEvent}
          onDelete={deleteEvent}
          discordWebhookUrl={discordWebhookUrl}
        />
      )}
      {isSettingsOpen && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          onSave={handleSaveSettings}
          currentWebhookUrl={discordWebhookUrl}
        />
      )}
    </div>
  );
};

export default App;