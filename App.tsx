import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Calendar } from './components/Calendar';
import { EventModal } from './components/EventModal';
import { Header } from './components/Header';
import { SettingsModal } from './components/SettingsModal';
import { type UserEvent, type SpecialDate, type CalendarEvent, type ChatMessage, type Theme, type SummaryRange } from './types';
import { getSpecialDates } from './services/uaeDatesService';
import { discoverEventsForMonth, getChatResponse } from './services/geminiService';
import { sendDiscordWebhook } from './services/discordService';

// --- Chat Modal Component ---
const ChatModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}> = ({ isOpen, onClose, messages, onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages, isLoading]);

  const handleSend = () => {
    if (input.trim()) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gray-100 dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg h-[80vh] flex flex-col border border-gray-300 dark:border-gray-700" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-300 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white text-center">Chat with your Calendar</h3>
        </div>
        <div className="flex-grow p-4 overflow-y-auto space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-xs md:max-w-md p-3 rounded-lg ${msg.role === 'user' ? 'bg-cyan-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'}`}>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-xs md:max-w-md p-3 rounded-lg bg-gray-200 dark:bg-gray-700">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:0.2s]"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:0.4s]"></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-4 border-t border-gray-300 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && !isLoading && handleSend()}
              placeholder="Ask about your events..."
              className="w-full px-3 py-2 bg-white dark:bg-gray-900 border border-gray-400 dark:border-gray-600 rounded-md focus:ring-cyan-500 focus:border-cyan-500 text-gray-900 dark:text-white"
              disabled={isLoading}
            />
            <button onClick={handleSend} disabled={isLoading || !input.trim()} className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors">
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


const App: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'year'>('month');
  const [userEvents, setUserEvents] = useState<UserEvent[]>([]);
  const [discoveredEvents, setDiscoveredEvents] = useState<SpecialDate[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingEvent, setEditingEvent] = useState<UserEvent | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isSendingSummary, setIsSendingSummary] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  // Settings state, now loaded from server
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState('');
  const [isAutoDiscoverEnabled, setIsAutoDiscoverEnabled] = useState(false);
  const [autoDiscoverFrequency, setAutoDiscoverFrequency] = useState(2);
  const [theme, setTheme] = useState<Theme>('dark');
  const [lastAutoDiscoverRun, setLastAutoDiscoverRun] = useState(0);

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

  const handleDiscoverEvents = async () => {
    setIsDiscovering(true);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    try {
      const newEvents = await discoverEventsForMonth(year, month);
      
      const existingEventKeys = new Set(allEvents.map(e => `${(e.type === 'user' ? e.title : e.name)}_${e.date.toDateString()}`));
      const uniqueNewEvents = newEvents.filter(newEvent => !existingEventKeys.has(`${newEvent.name}_${newEvent.date.toDateString()}`));

      // We add to client-side discovered events for immediate UI update.
      // The server will handle persistent storage.
      setDiscoveredEvents(prev => [...prev, ...uniqueNewEvents]);
    } catch (error) {
      console.error("Failed to discover events:", error);
    } finally {
      setIsDiscovering(false);
    }
  };
  
  useEffect(() => {
    const body = document.body;
    body.classList.remove('light', 'dark', 'bg-gray-900', 'bg-white');
    body.classList.add(theme);
    body.classList.add(theme === 'dark' ? 'bg-gray-900' : 'bg-white');
  }, [theme]);

  // Load all settings and discovered events from server on initial app load
  useEffect(() => {
    const loadAppData = async () => {
      // Fetch settings
      try {
        const response = await fetch('/api/settings');
        if (!response.ok) throw new Error(`Server responded with ${response.status}`);
        const settings = await response.json();
        setDiscordWebhookUrl(settings.webhookUrl || '');
        setIsAutoDiscoverEnabled(settings.isAutoDiscoverEnabled || false);
        setAutoDiscoverFrequency(settings.autoDiscoverFrequency || 2);
        setTheme(settings.theme || 'dark');
        setLastAutoDiscoverRun(settings.lastAutoDiscoverRun || 0);
      } catch (error) {
        console.error('Failed to load settings from server:', error);
      }
      
      // Fetch events discovered by server
      try {
        const response = await fetch('/api/discovered-events');
        if (!response.ok) throw new Error(`Server responded with ${response.status}`);
        const serverEvents = await response.json();
        const formattedEvents = serverEvents.map((e: any) => ({...e, date: new Date(e.date + 'T00:00:00')}));
        setDiscoveredEvents(formattedEvents);
      } catch (error) {
        console.error('Failed to load discovered events from server:', error);
      }
    };
    loadAppData();
  }, []);
  
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

  const handleSaveSettings = async (settings: { webhookUrl: string; isAutoDiscoverEnabled: boolean; autoDiscoverFrequency: number; theme: Theme; }) => {
    // Update state immediately for responsive UI
    setDiscordWebhookUrl(settings.webhookUrl);
    setIsAutoDiscoverEnabled(settings.isAutoDiscoverEnabled);
    setAutoDiscoverFrequency(settings.autoDiscoverFrequency);
    setTheme(settings.theme);
    
    // Save to server
    try {
        await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({...settings, lastAutoDiscoverRun})
        });
    } catch (error) {
        console.error("Failed to save settings to server:", error);
        alert("Could not save settings. Please check the server connection.");
    }
    
    setIsSettingsOpen(false);
  };

  const handleSendSummary = async (range: SummaryRange) => {
    if (!discordWebhookUrl) {
      alert("Please set your Discord Webhook URL in settings first.");
      return;
    }
    
    setIsSendingSummary(true);

    let summaryEvents: CalendarEvent[] = [];
    let title = '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let endDate = new Date(today);

    if (range === '7days') {
        endDate.setDate(today.getDate() + 7);
        title = `🗓️ Upcoming Events: Next 7 Days`;
    } else if (range === 'month') {
        endDate.setMonth(today.getMonth() + 1);
        title = `🗓️ Upcoming Events: Next Month`;
    } else { // 'year'
        endDate = new Date(today.getFullYear(), 11, 31);
        title = `🗓️ Upcoming Events: Rest of ${today.getFullYear()}`;
    }
    
    summaryEvents = allEvents
      .filter(e => e.date >= today && e.date <= endDate)
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    let payload;

    if (summaryEvents.length === 0) {
      payload = {
        embeds: [{
          title,
          description: "✅ No upcoming events found for this period.",
          color: 0x57F287, // Discord Green
          footer: { text: "Sent from UAE Seller's Smart Calendar" },
        }]
      };
    } else {
      const description = summaryEvents
        .slice(0, 25)
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

  const handleSendMessage = async (message: string) => {
    const newMessages: ChatMessage[] = [...chatMessages, { role: 'user', content: message }];
    setChatMessages(newMessages);
    setIsChatLoading(true);

    let contextEvents: CalendarEvent[] = [];
    if (viewMode === 'week') {
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
      startOfWeek.setHours(0,0,0,0);
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23,59,59,999);
      contextEvents = allEvents.filter(e => e.date >= startOfWeek && e.date <= endOfWeek);
    } else if (viewMode === 'month') { 
      contextEvents = allEvents.filter(e => e.date.getMonth() === currentDate.getMonth() && e.date.getFullYear() === currentDate.getFullYear());
    } else { // year
      contextEvents = allEvents.filter(e => e.date.getFullYear() === currentDate.getFullYear());
    }

    try {
      const response = await getChatResponse(message, newMessages, contextEvents);
      setChatMessages(prev => [...prev, { role: 'model', content: response }]);
    } catch (error) {
      console.error("Chat error:", error);
      setChatMessages(prev => [...prev, { role: 'model', content: "Sorry, something went wrong." }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const openChat = () => {
    if (chatMessages.length === 0) {
      setChatMessages([{ role: 'model', content: "Hello! I'm your calendar assistant. Ask me anything about your upcoming events, or for marketing ideas!" }]);
    }
    setIsChatOpen(true);
  };
  
  return (
    <div className="min-h-screen text-gray-800 dark:text-gray-100 p-4 sm:p-6 lg:p-8 font-sans">
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
          onOpenChat={openChat}
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
          isAutoDiscoverEnabled={isAutoDiscoverEnabled}
          autoDiscoverFrequency={autoDiscoverFrequency}
          currentTheme={theme}
        />
      )}
      <ChatModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        messages={chatMessages}
        onSendMessage={handleSendMessage}
        isLoading={isChatLoading}
      />
    </div>
  );
};

export default App;
