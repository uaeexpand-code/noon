
export interface SpecialDate {
  date: Date;
  name: string;
  category: 'National Holiday' | 'Religious' | 'Season' | 'Commercial' | 'E-commerce Sale' | 'Global Event' | 'Cultural' | 'Sporting' | 'Trending' | string;
  source?: string;
}

export interface UserEvent {
  id: string;
  date: Date;
  title: string;
  description?: string;
  source?: string;
}

export type CalendarEvent = (UserEvent & { type: 'user' }) | (SpecialDate & { type: 'special' | 'discovered' });

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export type AiProvider = 'gemini' | 'openai' | 'openrouter';
