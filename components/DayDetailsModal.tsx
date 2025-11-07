
import React, { useState, useCallback } from 'react';
import { type CalendarEvent, type UserEvent, type SpecialDate } from '../types';
import { generateMarketingIdeas } from '../services/geminiService';

interface DayDetailsModalProps {
  date: Date;
  events: CalendarEvent[];
  onClose: () => void;
  onAddEvent: () => void;
  onEditEvent: (event: UserEvent) => void;
}

const SparklesIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.293 2.293a1 1 0 010 1.414L10 16l-4 4-4-4 5.293-5.293a1 1 0 011.414 0L10 12m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2.293l2.293-2.293a1 1 0 000-1.414L18 4l-4 4-4-4 5.293 5.293a1 1 0 001.414 0L18 10m0 0l2 2m-2-2l-2 2" /></svg>
);

const IdeaGenerator: React.FC<{ event: SpecialDate | UserEvent | { name: string, category: string } }> = ({ event }) => {
    const [ideas, setIdeas] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showIdeas, setShowIdeas] = useState(false);

    const handleGenerateIdeas = useCallback(async () => {
        setIsLoading(true);
        setShowIdeas(true);
        setIdeas([]);
        const eventInfo = 'title' in event 
            ? { name: event.title, category: 'Custom Event' } 
            : { name: event.name, category: event.category };
        const result = await generateMarketingIdeas(eventInfo);
        setIdeas(result);
        setIsLoading(false);
    }, [event]);

    return (
        <div className="mt-2">
            {!showIdeas && (
                <button onClick={handleGenerateIdeas} disabled={isLoading} className="w-full text-left px-3 py-1.5 text-xs font-medium text-cyan-300 bg-cyan-900/50 rounded-md hover:bg-cyan-800/50 disabled:opacity-50 transition-all duration-200 flex items-center">
                    <SparklesIcon className="h-4 w-4 mr-2"/>
                    {isLoading ? 'Generating...' : 'Get Marketing Ideas'}
                </button>
            )}
            
            {showIdeas && (
                <div className="mt-2 p-3 bg-gray-900/70 rounded-lg animate-fadeIn">
                    {isLoading ? (
                        <p className="text-sm text-gray-400">Generating brilliant ideas...</p>
                    ) : (
                        <ul className="space-y-2 text-sm text-gray-300">
                            {ideas.map((idea, index) => (
                                <li key={index} className="list-disc list-inside ml-2">{idea}</li>
                            ))}
                        </ul>
                    )}
                </div>
            )}
        </div>
    );
};

const getEventTypeStyle = (event: CalendarEvent) => {
  if (event.type === 'user') return 'border-l-purple-500';
  if (event.type === 'discovered') return 'border-l-teal-500';
  
  switch (event.category) {
    case 'National Holiday': return 'border-l-red-500';
    case 'Religious': return 'border-l-green-500';
    case 'Season': return 'border-l-blue-500';
    case 'E-commerce Sale': return 'border-l-pink-500';
    case 'Global Event': return 'border-l-indigo-500';
    case 'Commercial': return 'border-l-yellow-500';
    default: return 'border-l-gray-500';
  }
};


export const DayDetailsModal: React.FC<DayDetailsModalProps> = ({ date, events, onClose, onAddEvent, onEditEvent }) => {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md" onClick={onClose}>
      <div className="bg-gray-800/80 backdrop-blur-lg animate-slideInUp rounded-xl shadow-2xl w-full max-w-lg h-[80vh] flex flex-col border border-gray-700/50" onClick={e => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-700/50">
          <h3 className="text-lg font-bold text-white">Events for</h3>
          <p className="text-sm text-cyan-400">{date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>

        <div className="flex-grow p-5 overflow-y-auto space-y-4">
          {events.length > 0 ? (
            events.map((event, index) => (
              <div key={event.type === 'user' ? event.id : event.name + index} className={`p-4 bg-gray-900/50 rounded-lg border-l-4 transition-all duration-300 ${getEventTypeStyle(event)}`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-semibold text-white flex items-center">
                      {event.source === 'manual' && <span className="mr-2" title="Manual Event">👤</span>}
                      {event.source && event.source !== 'manual' && event.source !== 'built-in' && <span className="mr-2" title={`Discovered by: ${event.source}`}>✨</span>}
                      {event.type === 'user' ? event.title : event.name}
                    </h4>
                    <p className="text-xs text-gray-400">{event.type === 'user' ? 'Your Event' : event.category}</p>
                    {event.type === 'user' && event.description && <p className="text-sm text-gray-300 mt-1 whitespace-pre-wrap">{event.description}</p>}
                  </div>
                  {event.type === 'user' && (
                    <button onClick={() => onEditEvent(event)} className="px-3 py-1 text-xs font-medium text-cyan-300 bg-gray-700 rounded-md hover:bg-cyan-600 hover:text-white transition-colors">
                      Edit
                    </button>
                  )}
                </div>
                <IdeaGenerator event={event} />
              </div>
            ))
          ) : (
            <div className="text-center text-gray-400 py-10">
              <p>No events for this day.</p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-700/50 bg-gray-900/20 flex justify-between items-center">
          <button onClick={onAddEvent} className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-500 transition-all duration-200 transform hover:scale-105 active:scale-95">
            Add New Event
          </button>
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700/80 rounded-md transition-all duration-200 transform hover:scale-105 active:scale-95">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
