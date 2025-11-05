import React, { useState } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (webhookUrl: string) => void;
  currentWebhookUrl: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentWebhookUrl,
}) => {
  const [webhookUrl, setWebhookUrl] = useState(currentWebhookUrl);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(webhookUrl);
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
              This allows the app to send reminders directly to your Discord channel.
              You can create a webhook in your Discord server's settings under Integrations.
            </p>
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
