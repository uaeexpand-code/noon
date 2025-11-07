
import React, { useState, useEffect } from 'react';
import { type UserEvent } from '../types';
import { sendDiscordWebhook } from '../services/discordService';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: Date;
  event: UserEvent | null;
  onSave: (eventData: Omit<UserEvent, 'id' | 'source' | 'date'>) => void;
  onDelete: (eventId: string) => void;
  discordWebhookUrl: string;
}

const CopyIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className || "h-5 w-5"} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
);

const DiscordReminder: React.FC<{
  webhookUrl: string;
  eventTitle: string;
  eventDescription?: string;
  eventDate: Date;
}> = ({ webhookUrl, eventTitle, eventDescription, eventDate }) => {
    const [reminderTime, setReminderTime] = useState('10:00');
    const [copied, setCopied] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [sendStatus, setSendStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const formattedDate = eventDate.toLocaleDateString('en-CA'); // YYYY-MM-DD
    const discordReminderCommand = `/remindme ${formattedDate} at ${reminderTime} to ${eventTitle}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(discordReminderCommand);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSendToDiscord = async () => {
        if (!webhookUrl || !eventTitle) return;

        setIsSending(true);
        setSendStatus('idle');

        const reminderDateTime = new Date(`${formattedDate}T${reminderTime}`);

        const payload = {
            content: `🔔 **Reminder set for: ${eventTitle}**`,
            embeds: [
                {
                    title: `📅 ${eventTitle}`,
                    description: eventDescription || "No description provided.",
                    color: 3447003, // #3498DB
                    fields: [
                        {
                            name: "Date & Time",
                            value: `<t:${Math.floor(reminderDateTime.getTime() / 1000)}:F>`,
                            inline: false
                        }
                    ],
                    footer: {
                        text: "Sent from UAE Seller's Smart Calendar"
                    },
                    timestamp: new Date().toISOString(),
                }
            ]
        };

        try {
            await sendDiscordWebhook(webhookUrl, payload);
            setSendStatus('success');
        } catch (error) {
            console.error("Failed to send to Discord:", error);
            setSendStatus('error');
        } finally {
            setIsSending(false);
            setTimeout(() => setSendStatus('idle'), 3000);
        }
    };
    
    return (
        <div className="p-4 bg-gray-700/50 rounded-lg">
            <label className="block text-sm font-medium text-gray-300 mb-2">Discord Reminder</label>
            {!webhookUrl ? (
                <div className="text-xs text-center text-gray-400 p-3 bg-gray-900/50 rounded-md">
                    To send reminders directly, please set your <strong className="text-cyan-400">Discord Webhook URL</strong> in the settings.
                </div>
            ) : (
                 <div className="flex items-center space-x-2">
                    <input type="time" value={reminderTime} onChange={e => setReminderTime(e.target.value)} className="px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 w-28 text-white transition-all duration-200"/>
                    <button
                        type="button"
                        onClick={handleSendToDiscord}
                        disabled={isSending || !eventTitle}
                        className={`flex-grow px-4 py-2 text-sm font-medium text-white rounded-md disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                            isSending ? 'bg-gray-600' :
                            sendStatus === 'success' ? 'bg-green-600' :
                            sendStatus === 'error' ? 'bg-red-600' :
                            'bg-indigo-600 hover:bg-indigo-500'
                        }`}
                    >
                        {isSending ? 'Sending...' : (sendStatus === 'success' ? 'Sent!' : (sendStatus === 'error' ? 'Failed! Try Again' : 'Send to Discord'))}
                    </button>
                 </div>
            )}
             <div className="mt-3 text-xs text-gray-400">Or, copy the command for a reminder bot:</div>
             <div className="flex items-center space-x-2 mt-1">
                <input type="text" readOnly value={discordReminderCommand} className="flex-grow px-3 py-2 text-xs bg-gray-900/50 text-gray-400 border border-gray-600 rounded-md" />
                <button type="button" onClick={handleCopy} className="p-2 bg-gray-600 hover:bg-cyan-600 rounded-md transition-all duration-200 transform hover:scale-110 active:scale-95">
                    {copied ? <span className="text-xs">Copied!</span> : <CopyIcon className="h-4 w-4"/>}
                </button>
            </div>
        </div>
    );
};

export const EventModal: React.FC<EventModalProps> = ({ isOpen, onClose, date, event, onSave, onDelete, discordWebhookUrl }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  useEffect(() => {
    if (event) {
      setTitle(event.title);
      setDescription(event.description || '');
    } else {
      setTitle('');
      setDescription('');
    }
  }, [event]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title) {
        onSave({ title, description });
    }
  };
  
  const handleDelete = () => {
    if (event && window.confirm('Are you sure you want to delete this event?')) {
        onDelete(event.id);
    }
  };


  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md" onClick={onClose}>
      <div className="bg-gray-800/80 backdrop-blur-lg animate-slideInUp rounded-xl shadow-2xl w-full max-w-md border border-gray-700/50" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-700/50">
          <h3 className="text-lg font-bold text-white">
            {event ? 'Edit Event' : 'Add Event'}
          </h3>
          <p className="text-sm text-cyan-400">{date.toDateString()}</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">Title</label>
            <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} required className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white transition-all duration-200"/>
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={3} className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 text-white transition-all duration-200"></textarea>
          </div>
          
          <DiscordReminder
            webhookUrl={discordWebhookUrl}
            eventTitle={title}
            eventDescription={description}
            eventDate={date}
          />

          <div className="pt-4 flex justify-between items-center">
            <div>
              {event && (
                <button type="button" onClick={handleDelete} className="px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/20 rounded-md transition-all duration-200 transform hover:scale-105 active:scale-95">
                  Delete
                </button>
              )}
            </div>
            <div className="flex space-x-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700/80 rounded-md transition-all duration-200 transform hover:scale-105 active:scale-95">
                Cancel
              </button>
              <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-500 transition-all duration-200 transform hover:scale-105 active:scale-95">
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
