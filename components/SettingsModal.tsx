
import React, { useState } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: { webhookUrl: string; isAutoDiscoverEnabled: boolean; autoDiscoverFrequency: number; }) => void;
  currentWebhookUrl: string;
  isAutoDiscoverEnabled: boolean;
  autoDiscoverFrequency: number;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentWebhookUrl,
  isAutoDiscoverEnabled,
  autoDiscoverFrequency,
}) => {
  const [webhookUrl, setWebhookUrl] = useState(currentWebhookUrl);
  const [autoDiscover, setAutoDiscover] = useState(isAutoDiscoverEnabled);
  const [frequency, setFrequency] = useState(autoDiscoverFrequency);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      webhookUrl,
      isAutoDiscoverEnabled: autoDiscover,
      autoDiscoverFrequency: Number(frequency) || 2, // Default to 2 if input is invalid
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg border border-gray-700" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-lg font-bold text-white">Settings</h3>
          <p className="text-sm text-gray-400">Configure application settings</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <h4 className="text-md font-medium text-gray-200 mb-2">Integrations</h4>
            <label htmlFor="webhookUrl" className="block text-sm font-medium text-gray-300 mb-1">
              Discord Webhook URL
            </label>
            <input 
              type="url" 
              id="webhookUrl" 
              value={webhookUrl} 
              onChange={e => setWebhookUrl(e.target.value)} 
              placeholder="https://discord.com/api/webhooks/..."
              className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-cyan-500 focus:border-cyan-500"
              aria-describedby="webhook-description"
            />
            <p id="webhook-description" className="mt-2 text-xs text-gray-400">
              This allows the app to send reminders and summaries directly to your Discord channel.
            </p>
          </div>

          <div className="space-y-4">
             <h4 className="text-md font-medium text-gray-200">Automated Event Discovery</h4>
             <div className="flex items-center justify-between p-3 bg-gray-900/50 rounded-md">
                <label htmlFor="auto-discover-toggle" className="text-sm font-medium text-gray-300">
                  Enable automatic background search
                </label>
                <div className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={autoDiscover} onChange={e => setAutoDiscover(e.target.checked)} id="auto-discover-toggle" className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-cyan-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                </div>
            </div>
             {autoDiscover && (
                <div>
                  <label htmlFor="frequency" className="block text-sm font-medium text-gray-300 mb-1">
                    Run discovery every (days)
                  </label>
                  <input 
                    type="number" 
                    id="frequency" 
                    value={frequency} 
                    onChange={e => setFrequency(parseInt(e.target.value, 10))} 
                    min="1"
                    className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-cyan-500 focus:border-cyan-500"
                    aria-describedby="frequency-description"
                  />
                  <p id="frequency-description" className="mt-2 text-xs text-gray-400">
                    The app will check for new events when you open it, if the last check was more than this many days ago.
                  </p>
                </div>
              )}
          </div>
          
          <div className="pt-4 flex justify-end space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 rounded-md transition-colors duration-200">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-500 transition-colors duration-200">
              Save Settings
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
