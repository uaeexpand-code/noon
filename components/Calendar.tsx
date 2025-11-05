
import React from 'react';
import { type CalendarEvent, type UserEvent } from '../types';

type ViewMode = 'month' | 'week' | 'year';

interface CalendarProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDateSelect: (date: Date, event?: UserEvent) => void;
  viewMode: ViewMode;
  setCurrentDate: (date: Date) => void;
  setViewMode: (view: ViewMode) => void;
}

// --- Styling and Utility Functions ---

const getEventTypeStyle = (event: CalendarEvent) => {
  if (event.type === 'user') return 'bg-purple-600/80 hover:bg-purple-500 text-white cursor-pointer';
  if (event.type === 'discovered') return 'bg-teal-600/80 text-white';
  
  switch (event.category) {
    case 'National Holiday': return 'bg-red-500/80 text-white';
    case 'Religious': return 'bg-green-500/80 text-white';
    case 'Season': return 'bg-blue-500/80 text-white';
    case 'E-commerce Sale': return 'bg-pink-500/80 text-white';
    case 'Global Event': return 'bg-indigo-500/80 text-white';
    case 'Commercial': return 'bg-yellow-500/80 text-gray-900';
    default: return 'bg-gray-600/80 text-white';
  }
};

const isSameDay = (d1: Date, d2: Date) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();

// --- Day Cell Component (Used by Month and Week Views) ---

const DayCell: React.FC<{
  date: Date;
  isToday: boolean;
  isCurrentMonth?: boolean; // Optional for week view
  dayEvents: CalendarEvent[];
  onDateSelect: (date: Date, event?: UserEvent) => void;
  isTall?: boolean; // For week view
}> = ({ date, isToday, isCurrentMonth = true, dayEvents, onDateSelect, isTall = false }) => {
  
  const handleCellClick = () => onDateSelect(date);
  const handleEventClick = (e: React.MouseEvent, event: UserEvent) => {
    e.stopPropagation();
    onDateSelect(date, event);
  };

  const cellClasses = `relative flex flex-col p-2 border border-gray-700/50 transition-all duration-200 group overflow-hidden rounded-lg transform hover:scale-105 hover:z-10 hover:shadow-2xl ${isCurrentMonth ? 'bg-gray-800 hover:bg-gray-700/70 cursor-pointer' : 'bg-gray-900/50 text-gray-500'} ${isTall ? 'min-h-[120px]' : 'aspect-square'}`;
  const dayNumberClasses = `text-xs sm:text-sm font-semibold flex items-center justify-center h-6 w-6 rounded-full transition-colors duration-200 ${isToday ? 'bg-cyan-500 text-white' : 'text-gray-300 group-hover:text-white'}`;
  
  return (
    <div className={cellClasses} onClick={handleCellClick}>
      <div className="flex justify-end">
        <span className={dayNumberClasses}>{date.getDate()}</span>
      </div>
      <div className="flex-grow overflow-y-auto mt-1 space-y-1 pr-1 -mr-2">
         {dayEvents.map((event, index) => (
           <div
              key={event.type === 'user' ? event.id : event.name + index}
              onClick={(e) => event.type === 'user' && handleEventClick(e, event)}
              className={`text-xs px-1.5 py-0.5 rounded-md truncate transition-colors duration-200 ${getEventTypeStyle(event)}`}
            >
              {event.type === 'user' ? event.title : event.name}
            </div>
          ))}
      </div>
    </div>
  );
};

// --- Month View Component ---

const MonthView: React.FC<Omit<CalendarProps, 'viewMode' | 'setViewMode' | 'setCurrentDate'>> = ({ currentDate, events, onDateSelect }) => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const calendarDays = [];
    for (let i = 0; i < firstDayOfMonth; i++) calendarDays.push(<div key={`empty-start-${i}`} className="aspect-square bg-transparent border border-gray-700/20 rounded-lg" />);

    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dayEvents = events.filter(e => isSameDay(e.date, date));
        calendarDays.push(<DayCell key={day} date={date} isToday={isSameDay(date, new Date())} isCurrentMonth={true} dayEvents={dayEvents} onDateSelect={onDateSelect} />);
    }
  
    const totalCells = firstDayOfMonth + daysInMonth;
    const remainingCells = (7 - (totalCells % 7)) % 7;
    for (let i = 0; i < remainingCells; i++) calendarDays.push(<div key={`empty-end-${i}`} className="aspect-square bg-transparent border border-gray-700/20 rounded-lg" />);

    return (
        <>
            <div className="grid grid-cols-7 gap-1 text-center font-semibold text-cyan-400 mb-2">
                {daysOfWeek.map(day => <div key={day} className="text-xs sm:text-base">{day}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">{calendarDays}</div>
        </>
    );
};

// --- Week View Component ---

const WeekView: React.FC<Omit<CalendarProps, 'viewMode' | 'setViewMode' | 'setCurrentDate'>> = ({ currentDate, events, onDateSelect }) => {
    const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());

    const weekDays = Array.from({ length: 7 }).map((_, i) => {
        const date = new Date(startOfWeek);
        date.setDate(date.getDate() + i);
        return date;
    });

    return (
        <>
            <div className="grid grid-cols-7 gap-1 text-center font-semibold text-cyan-400 mb-2">
                {daysOfWeek.map((day, i) => <div key={day} className="text-xs sm:text-base">{day} <span className="text-gray-400">{weekDays[i].getDate()}</span></div>)}
            </div>
            <div className="grid grid-cols-7 gap-1">
                {weekDays.map(date => {
                    const dayEvents = events.filter(e => isSameDay(e.date, date));
                    return <DayCell key={date.toISOString()} date={date} isToday={isSameDay(date, new Date())} dayEvents={dayEvents} onDateSelect={onDateSelect} isTall={true}/>
                })}
            </div>
        </>
    );
};


// --- Year View Component ---

const YearView: React.FC<Omit<CalendarProps, 'viewMode' | 'onDateSelect'>> = ({ currentDate, events, setCurrentDate, setViewMode }) => {
    const year = currentDate.getFullYear();
    const months = Array.from({ length: 12 }).map((_, i) => new Date(year, i, 1));
    const today = new Date();

    const handleMonthClick = (monthDate: Date) => {
        setCurrentDate(monthDate);
        setViewMode('month');
    };

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {months.map(monthDate => {
                const month = monthDate.getMonth();
                const monthName = monthDate.toLocaleString('default', { month: 'long' });
                const daysInMonth = new Date(year, month + 1, 0).getDate();
                const firstDay = new Date(year, month, 1).getDay();

                const monthEvents = events.filter(e => e.date.getFullYear() === year && e.date.getMonth() === month);

                return (
                    <div key={month} className="p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-700/70 border border-transparent hover:border-cyan-500/50 transition-all duration-300" onClick={() => handleMonthClick(monthDate)}>
                        <h4 className={`font-bold text-center mb-2 ${today.getFullYear() === year && today.getMonth() === month ? 'text-cyan-400' : 'text-white'}`}>{monthName}</h4>
                        <div className="grid grid-cols-7 gap-1 text-xs text-center text-gray-500">
                            {['S','M','T','W','T','F','S'].map(d=><div key={d}>{d}</div>)}
                        </div>
                        <div className="grid grid-cols-7 gap-1 mt-1">
                           {Array.from({length: firstDay}).map((_,i) => <div key={`empty-${i}`} />)}
                           {Array.from({length: daysInMonth}).map((_,i) => {
                               const day = i + 1;
                               const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
                               const hasEvent = monthEvents.some(e => e.date.getDate() === day);
                               return <div key={day} className={`w-full aspect-square rounded-full flex items-center justify-center text-xs transition-colors duration-200 ${isToday ? 'bg-cyan-500 text-white' : hasEvent ? 'bg-purple-500/50' : 'bg-gray-700/40'}`}></div>
                           })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};


// --- Main Calendar Switcher Component ---

export const Calendar: React.FC<CalendarProps> = (props) => {
  
  const renderView = () => {
    switch (props.viewMode) {
      case 'year':
        return <YearView {...props} />;
      case 'week':
        return <WeekView {...props} />;
      case 'month':
      default:
        return <MonthView {...props} />;
    }
  };

  return (
    <div className="bg-gray-800/60 backdrop-blur-xl rounded-xl shadow-2xl p-4 border border-white/10 animate-fadeIn">
      {renderView()}
    </div>
  );
};