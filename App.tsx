
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Calendar } from './components/Calendar';
import { EventModal } from './components/EventModal';
import { Header } from './components/Header';
import { SettingsModal } from './components/SettingsModal';
import { type UserEvent, type SpecialDate, type CalendarEvent, type ChatMessage, type AiProvider } from './types';
import { getSpecialDates } from './services/uaeDatesService';
import { discoverEventsForMonth, getChatResponse } from './services/aiService';

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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md" onClick={onClose}>
      <div className="bg-gray-800/80 backdrop-blur-lg animate-slideInUp rounded-xl shadow-2xl w-full max-w-lg h-[80vh] flex flex-col border border-gray-700/50" onClick={e => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-700/50">
          <h3 className="text-lg font-bold text-white text-center">Chat with your Calendar</h3>
        </div>
        <div className="flex-grow p-4 overflow-y-auto space-y-4">
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fadeIn`}>
              <div className={`max-w-xs md:max-w-md p-3 rounded-lg ${msg.role === 'user' ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-white'}`}>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start animate-fadeIn">
              <div className="max-w-xs md:max-w-md p-3 rounded-lg bg-gray-700">
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
        <div className="p-4 border-t border-gray-700/50 bg-gray-900/20">
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && !isLoading && handleSend()}
              placeholder="Ask about your events..."
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white transition-all duration-200"
              disabled={isLoading}
            />
            <button onClick={handleSend} disabled={isLoading || !input.trim()} className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-500 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95">
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
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [lastDiscoverySources, setLastDiscoverySources] = useState<{ uri: string; title: string; }[]>([]);
  const isInitialMount = useRef(true);
  
  // --- Settings State ---
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState('');
  const [isAutoDiscoverEnabled, setIsAutoDiscoverEnabled] = useState(false);
  const [autoDiscoverFrequency, setAutoDiscoverFrequency] = useState(2);
  const [lastAutoDiscoverRun, setLastAutoDiscoverRun] = useState(0);
  const [aiProvider, setAiProvider] = useState<AiProvider>('gemini');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [openrouterApiKey, setOpenrouterApiKey] = useState('');
  const [openaiModel, setOpenaiModel] = useState('gpt-4o');
  const [openrouterModel, setOpenrouterModel] = useState('anthropic/claude-3-haiku');
  const [isAutoNotifyEnabled, setIsAutoNotifyEnabled] = useState(false);
  const [notifyDaysBefore, setNotifyDaysBefore] = useState(7);
  const [isDailyBriefingEnabled, setIsDailyBriefingEnabled] = useState(false);
  const [dailyBriefingTime, setDailyBriefingTime] = useState('08:00');

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
    setLastDiscoverySources([]); // Clear previous sources on new discovery
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    try {
      const { events: newEvents, sources } = await discoverEventsForMonth(year, month);
      
      const getEventKey = (e: CalendarEvent | SpecialDate) => {
          const name = 'title' in e ? e.title : e.name;
          return `${name.trim()}_${e.date.toDateString()}`;
      };

      const existingEventKeys = new Set(allEvents.map(getEventKey));
      const uniqueNewEvents = newEvents.filter(newEvent => !existingEventKeys.has(getEventKey(newEvent)));

      if (uniqueNewEvents.length > 0) {
        setDiscoveredEvents(prev => [...prev, ...uniqueNewEvents]);
        if (sources.length > 0) {
          setLastDiscoverySources(sources);
        }
      }
    } catch (error) {
      console.error("Failed to discover events:", error);
      alert("Failed to discover events. Your AI provider might be configured incorrectly. Check settings and the console.");
    } finally {
      setIsDiscovering(false);
    }
  };
  
  // Load all app data from server on initial load
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
        setLastAutoDiscoverRun(settings.lastAutoDiscoverRun || 0);
        setAiProvider(settings.aiProvider || 'gemini');
        setOpenaiApiKey(settings.openaiApiKey || '');
        setOpenrouterApiKey(settings.openrouterApiKey || '');
        setOpenaiModel(settings.openaiModel || 'gpt-4o');
        setOpenrouterModel(settings.openrouterModel || 'anthropic/claude-3-haiku');
        setIsAutoNotifyEnabled(settings.isAutoNotifyEnabled || false);
        setNotifyDaysBefore(settings.notifyDaysBefore || 7);
        setIsDailyBriefingEnabled(settings.isDailyBriefingEnabled || false);
        setDailyBriefingTime(settings.dailyBriefingTime || '08:00');
      } catch (error) { console.error('Failed to load settings:', error); }
      
      // Fetch server-discovered events
      try {
        const response = await fetch('/api/discovered-events');
        if (!response.ok) throw new Error(`Server responded with ${response.status}`);
        const serverEvents = await response.json();
        const formattedEvents = serverEvents.map((e: any) => ({...e, date: new Date(e.date)}));
        setDiscoveredEvents(formattedEvents);
      } catch (error) { console.error('Failed to load discovered events:', error); }

      // Fetch user-created events
      try {
        const response = await fetch('/api/user-events');
        if (!response.ok) throw new Error(`Server responded with ${response.status}`);
        const userEventsData = await response.json();
        const formattedEvents = userEventsData.map((e: any) => ({...e, date: new Date(e.date)}));
        setUserEvents(formattedEvents);
      } catch (error) { console.error('Failed to load user events:', error); }

      // Fetch chat history
      try {
        const response = await fetch('/api/chat-history');
        if (!response.ok) throw new Error(`Server responded with ${response.status}`);
        setChatMessages(await response.json());
      } catch (error) { console.error('Failed to load chat history:', error); }

      isInitialMount.current = false;
    };
    loadAppData();
  }, []);
  
  // Save user events to server when they change
  useEffect(() => {
    if (isInitialMount.current) return;
    fetch('/api/user-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userEvents)
    }).catch(error => console.error("Failed to save user events:", error));
  }, [userEvents]);

  // Save discovered events to server when they change
  useEffect(() => {
    if (isInitialMount.current) return;
    fetch('/api/discovered-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(discoveredEvents)
    }).catch(error => console.error("Failed to save discovered events:", error));
  }, [discoveredEvents]);

  // Save chat history to server when it changes
  useEffect(() => {
    if (isInitialMount.current) return;
    fetch('/api/chat-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatMessages)
    }).catch(error => console.error("Failed to save chat history:", error));
  }, [chatMessages]);

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

  const handleSaveSettings = async (settings: { 
      webhookUrl: string; 
      isAutoDiscoverEnabled: boolean; 
      autoDiscoverFrequency: number; 
      aiProvider: AiProvider;
      openaiApiKey: string;
      openrouterApiKey: string;
      openaiModel: string;
      openrouterModel: string;
      isAutoNotifyEnabled: boolean;
      notifyDaysBefore: number;
      isDailyBriefingEnabled: boolean;
      dailyBriefingTime: string;
  }) => {
    // Update state immediately for responsive UI
    setDiscordWebhookUrl(settings.webhookUrl);
    setIsAutoDiscoverEnabled(settings.isAutoDiscoverEnabled);
    setAutoDiscoverFrequency(settings.autoDiscoverFrequency);
    setAiProvider(settings.aiProvider);
    setOpenaiApiKey(settings.openaiApiKey);
    setOpenrouterApiKey(settings.openrouterApiKey);
    setOpenaiModel(settings.openaiModel);
    setOpenrouterModel(settings.openrouterModel);
    setIsAutoNotifyEnabled(settings.isAutoNotifyEnabled);
    setNotifyDaysBefore(settings.notifyDaysBefore);
    setIsDailyBriefingEnabled(settings.isDailyBriefingEnabled);
    setDailyBriefingTime(settings.dailyBriefingTime);
    
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
    <div className="min-h-screen text-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <Header 
          currentDate={currentDate} 
          setCurrentDate={setCurrentDate} 
          onOpenSettings={() => setIsSettingsOpen(true)}
          onDiscoverEvents={handleDiscoverEvents}
          isDiscovering={isDiscovering}
          viewMode={viewMode}
          setViewMode={setViewMode}
          onOpenChat={openChat}
        />
        {lastDiscoverySources.length > 0 && (
            <div className="my-4 p-4 bg-gray-800 rounded-xl shadow-lg animate-fadeIn border border-teal-500/30">
                <div className="flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-teal-300 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"></path></svg>
                        <span>Events discovered using Google Search. Sources:</span>
                    </h3>
                    <button onClick={() => setLastDiscoverySources([])} className="p-1 rounded-full text-gray-400 hover:bg-gray-700 hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                <ul className="mt-2 text-xs list-none space-y-1 pl-6">
                    {lastDiscoverySources.map((source, index) => (
                        <li key={index} className="truncate">
                            <a href={source.uri} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline" title={source.title || source.uri}>
                                {source.title || new URL(source.uri).hostname}
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
        )}
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
          currentAiProvider={aiProvider}
          currentOpenaiApiKey={openaiApiKey}
          currentOpenrouterApiKey={openrouterApiKey}
          currentOpenaiModel={openaiModel}
          currentOpenrouterModel={openrouterModel}
          isAutoNotifyEnabled={isAutoNotifyEnabled}
          notifyDaysBefore={notifyDaysBefore}
          isDailyBriefingEnabled={isDailyBriefingEnabled}
          dailyBriefingTime={dailyBriefingTime}
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
