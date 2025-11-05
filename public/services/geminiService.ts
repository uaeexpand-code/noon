import { Type } from "@google/genai";
import { type SpecialDate } from '../types';

// Helper function to handle API calls to our own server proxy
async function fetchFromProxy(action: string, body: object) {
  try {
    const response = await fetch(`/api/gemini/${action}`, {
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

export const generateMarketingIdeas = async (event: SpecialDate | { name: string; category: string }): Promise<string[]> => {
  try {
    const ideas = await fetchFromProxy('generateMarketingIdeas', { 
        event,
        schema: {
            type: Type.ARRAY,
            items: {
                type: Type.STRING,
                description: 'A single marketing idea.'
            }
        }
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
            schema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        date: {
                            type: Type.STRING,
                            description: "The date of the event in YYYY-MM-DD format.",
                        },
                        name: {
                            type: Type.STRING,
                            description: "The name of the event.",
                        },
                        category: {
                            type: Type.STRING,
                            description: "The category: E-commerce Sale, Global Event, Cultural, Sporting, Trending.",
                        },
                    },
                    required: ["date", "name", "category"],
                },
            },
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
