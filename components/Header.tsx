import React from 'react';

type ViewMode = 'month' | 'week' | 'year';

interface HeaderProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  onOpenSettings: () => void;
  onDiscoverEvents: () => void;
  isDiscovering: boolean;
  viewMode: ViewMode;
  setViewMode: (view: ViewMode) => void;
  onOpenChat: () => void;
  onCheckChineseHolidays: () => void;
  isCheckingChineseHolidays: boolean;
}

// --- Helper Functions for Date Formatting ---
const getWeekRange = (date: Date) => {
    const start = new Date(date);
    start.setDate(start.getDate() - start.getDay());
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    
    const startMonth = start.toLocaleString('default', { month: 'short' });
    const endMonth = end.toLocaleString('default', { month: 'short' });

    if (start.getFullYear() !== end.getFullYear()) {
         return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
    }
    if (startMonth === endMonth) {
        return `${startMonth} ${start.getDate()} - ${end.getDate()}, ${start.getFullYear()}`;
    }
    return `${startMonth} ${start.getDate()} - ${endMonth} ${end.getDate()}, ${start.getFullYear()}`;
};

const getTitle = (date: Date, viewMode: ViewMode) => {
    switch (viewMode) {
        case 'year':
            return date.getFullYear();
        case 'week':
            return getWeekRange(date);
        case 'month':
        default:
            return date.toLocaleString('default', { month: 'long', year: 'numeric' });
    }
};

// --- Icon Components ---
const ChevronLeftIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>);
const ChevronRightIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>);
const CogIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>);
const WandIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 4V2m0 18v-2m5-13h2M2 9h2m13 13l-1.4-1.4M4.4 19.6L3 18.2m16.2.4l-1.4-1.4M3 5.8l1.4 1.4M9 22v-2m0-18V2m13 5h2M2 9h2m-1.6 9.6l1.4-1.4M18.2 3l1.4 1.4m-16.8.4l1.4-1.4M9 2v2m0 18v-2m5-13h-2M4 9H2m13 .5l-1-1M7.5 21.5l-1-1m12-12l-1-1M4.5 7.5l-1-1" /><path d="M12 5.5A6.5 6.5 0 0 0 5.5 12a6.5 6.5 0 0 0 6.5 6.5A6.5 6.5 0 0 0 18.5 12 6.5 6.5 0 0 0 12 5.5z" /></svg>);
const LoadingSpinner = () => (<svg className="animate-spin h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>);
const ChatBubbleIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>);
const ChinaFlagIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 36 24"><path fill="#ee1c25" d="M0 0h36v24H0z"/><path fill="#ff0" d="m6 4.5 1.1.8L6.3 7V5.4l1.4.2-1.5.1.8 1.1-.9-.8.2 1.4V5.2l.8.9zm5.3 1.8.8.6-.7.9.9-.7.6.8-.9-.7.9-.6-.7.9.6-.8-.7.9zm1.8 3 .4.9-.9-.4.9.3-.9-.4.9.4-.4-.9.9.4-.4-.9.4.9zm-3.6 2.2.6.8-.9-.6.8.6-.9-.7.8.6-.6-.8.8.6-.6-.8.6.8zm-5.4.7.8.6-.7.9.9-.7.6.8-.9-.7.9-.6-.7.9.6-.8-.7.9z"/></svg>);


// --- Main Header Component ---
export const Header: React.FC<HeaderProps> = ({ currentDate, setCurrentDate, onOpenSettings, onDiscoverEvents, isDiscovering, viewMode, setViewMode, onOpenChat, onCheckChineseHolidays, isCheckingChineseHolidays }) => {
  
  const handleNavigation = (direction: 'prev' | 'next' | 'today') => {
    if (direction === 'today') {
      setCurrentDate(new Date());
      return;
    }

    const newDate = new Date(currentDate);
    const increment = direction === 'prev' ? -1 : 1;

    switch (viewMode) {
      case 'year':
        newDate.setFullYear(newDate.getFullYear() + increment);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (7 * increment));
        break;
      case 'month':
      default:
        newDate.setMonth(newDate.getMonth() + increment, 1);
        break;
    }
    setCurrentDate(newDate);
  };
  
  const views: ViewMode[] = ['month', 'week', 'year'];

  return (
    <header className="relative z-20 flex flex-wrap items-center justify-between gap-4 mb-4 sm:mb-6 p-4 rounded-xl bg-gray-800/60 backdrop-blur-xl shadow-lg border border-white/10 animate-fadeIn">
        <div className="flex items-center space-x-2">
            <h1 className="text-xl sm:text-2xl font-light text-white hidden sm:block">Seller's Calendar</h1>
            <span className="text-xl sm:text-2xl font-bold text-cyan-400">UAE</span>
        </div>
        
        <div className="flex items-center flex-grow justify-center space-x-2 sm:space-x-4">
            <button
                onClick={() => handleNavigation('today')}
                className="px-3 py-2 text-sm font-medium text-gray-200 bg-gray-700/80 rounded-md hover:bg-cyan-500 hover:text-white transition-all duration-200 border border-transparent shadow-sm transform hover:scale-105 active:scale-95"
            >
                Today
            </button>
            <div className="flex items-center">
                <button onClick={() => handleNavigation('prev')} className="p-2 text-gray-400 hover:text-white rounded-full transition-all duration-200 transform hover:scale-110 active:scale-95 group" aria-label="Previous period">
                    <span className="flex items-center justify-center h-8 w-8 rounded-full group-hover:bg-gray-700/80 transition-colors">
                        <ChevronLeftIcon />
                    </span>
                </button>
                <h2 className="w-32 sm:w-48 text-center text-sm sm:text-xl font-semibold text-white">
                    {getTitle(currentDate, viewMode)}
                </h2>
                <button onClick={() => handleNavigation('next')} className="p-2 text-gray-400 hover:text-white rounded-full transition-all duration-200 transform hover:scale-110 active:scale-95 group" aria-label="Next period">
                     <span className="flex items-center justify-center h-8 w-8 rounded-full group-hover:bg-gray-700/80 transition-colors">
                        <ChevronRightIcon />
                    </span>
                </button>
            </div>
        </div>

        <div className="flex items-center space-x-1">
            <div className="hidden sm:flex items-center bg-gray-700/80 rounded-md p-0.5">
                 {views.map(view => (
                     <button key={view} onClick={() => setViewMode(view)} className={`px-2 py-1 text-sm rounded-md capitalize transition-colors duration-200 ${viewMode === view ? 'bg-cyan-600 text-white shadow-md' : 'text-gray-300 hover:bg-gray-600/50'}`}>
                         {view}
                     </button>
                 ))}
            </div>
             <button
              onClick={onCheckChineseHolidays}
              disabled={isCheckingChineseHolidays}
              className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700/80 transition-all duration-200 transform hover:scale-110 active:scale-95 disabled:cursor-not-allowed"
              aria-label="Check Chinese holidays"
              title="Send upcoming Chinese holidays to Discord"
            >
              {isCheckingChineseHolidays ? <LoadingSpinner /> : <ChinaFlagIcon />}
            </button>
            <button
              onClick={onDiscoverEvents}
              disabled={isDiscovering}
              className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700/80 transition-all duration-200 transform hover:scale-110 active:scale-95 disabled:cursor-not-allowed"
              aria-label="Discover events with AI"
            >
              {isDiscovering ? <LoadingSpinner /> : <WandIcon />}
            </button>
            <button 
              onClick={onOpenChat} 
              className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700/80 transition-all duration-200 transform hover:scale-110 active:scale-95"
              aria-label="Open chat assistant"
            >
              <ChatBubbleIcon />
            </button>
            <button 
              onClick={onOpenSettings} 
              className="p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700/80 transition-all duration-200 transform hover:scale-110 active:scale-95"
              aria-label="Open settings"
            >
              <CogIcon />
            </button>
        </div>
    </header>
  );
};
