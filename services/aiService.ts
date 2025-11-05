
import { Type } from "@google/genai";
import { type SpecialDate, type CalendarEvent, type ChatMessage, type AiProvider } from '../types';

// Helper function to handle API calls to our own server proxy
async function fetchFromProxy(action: string, body: object) {
  try {
    const response = await fetch(`/api/ai/${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }
    return response.json();
  } catch (error) {
    console.error(`Error fetching from proxy for action "${action}":`, error);
    throw error;
  }
}

export const testAiConnection = async (provider: AiProvider, apiKey?: string) => {
    try {
        const response = await fetch('/api/ai/test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ provider, apiKey }),
        });
        return response.json(); // Should return { success: true } or { success: false, error: '...' }
    } catch (error) {
        console.error(`Error testing AI connection for "${provider}":`, error);
        return { success: false, error: 'Client-side error during test.' };
    }
};


export const generateMarketingIdeas = async (event: SpecialDate | { name: string; category: string }): Promise<string[]> => {
  try {
    const ideas = await fetchFromProxy('generateMarketingIdeas', { 
        event,
        // The schema is now handled by the server based on the provider
    });
    
    if (Array.isArray(ideas) && ideas.every(item => typeof item === 'string')) {
        return ideas;
    } else {
        throw new Error("Invalid format received from server.");
    }

  } catch (error) {
    return ["Failed to generate ideas. Please check the console for more details."];
  }
};

export const discoverEventsForMonth = async (year: number, month: number): Promise<SpecialDate[]> => {
    try {
        const discovered = await fetchFromProxy('discoverEvents', {
            year,
            month,
            // The schema is now handled by the server based on the provider
        });
        
        if (Array.isArray(discovered)) {
            return discovered.map(item => ({
                ...item,
                date: new Date(item.date + 'T00:00:00'), // Ensure date is parsed correctly as local time
            })).filter(item => !isNaN(item.date.getTime()));
        }
        return [];
    } catch (error) {
        return [];
    }
};

export const getChatResponse = async (
  message: string, 
  history: ChatMessage[], 
  events: CalendarEvent[]
): Promise<string> => {
  try {
    const responseText = await fetchFromProxy('chat', {
      message,
      history,
      events,
    });
    
    if (typeof responseText === 'string') {
        return responseText;
    } else {
        console.error("Invalid format received from server for chat:", responseText);
        throw new Error("Invalid format received from server.");
    }
  } catch (error) {
    return "Sorry, I encountered an error. Please try again.";
  }
};