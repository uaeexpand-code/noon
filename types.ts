
export interface SpecialDate {
  date: Date;
  name: string;
  category: 'National Holiday' | 'Religious' | 'Season' | 'Commercial' | 'E-commerce Sale' | 'Global Event' | 'Cultural' | 'Sporting' | 'Trending' | string;
}

export interface UserEvent {
  id: string;
  date: Date;
  title: string;
  description?: string;
}

export type CalendarEvent = (UserEvent & { type: 'user' }) | (SpecialDate & { type: 'special' | 'discovered' });
