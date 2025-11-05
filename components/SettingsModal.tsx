
import React, { useState } from 'react';
import { type Theme, type AiProvider } from '../types';
import { testAiConnection } from '../services/aiService';

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: { 
    webhookUrl: string; 
    isAutoDiscoverEnabled: boolean; 
    autoDiscoverFrequency: number; 
    theme: Theme;
    aiProvider: AiProvider;
    openaiApiKey: string;
    openrouterApiKey: string;
  }) => void;
  currentWebhookUrl: string;
  isAutoDiscoverEnabled: boolean;
  autoDiscoverFrequency: number;
  currentTheme: Theme;
  currentAiProvider: AiProvider;
  currentOpenaiApiKey: string;
  currentOpenrouterApiKey: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onSave,
  currentWebhookUrl,
  isAutoDiscoverEnabled,
  autoDiscoverFrequency,
  currentTheme,
  currentAiProvider,
  currentOpenaiApiKey,
  currentOpenrouterApiKey,
}) => {
  const [webhookUrl, setWebhookUrl] = useState(currentWebhookUrl);
  const [autoDiscover, setAutoDiscover] = useState(isAutoDiscoverEnabled);
  const [frequency, setFrequency] = useState(autoDiscoverFrequency);
  const [theme, setTheme] = useState(currentTheme);
  const [aiProvider, setAiProvider] = useState<AiProvider>(currentAiProvider);
  const [openaiApiKey, setOpenaiApiKey] = useState(currentOpenaiApiKey);
  const [openrouterApiKey, setOpenrouterApiKey] = useState(currentOpenrouterApiKey);
  const [testStatus, setTestStatus] = useState<Record<AiProvider, TestStatus>>({
      gemini: 'idle',
      openai: 'idle',
      openrouter: 'idle'
  });

  const handleTest = async (provider: AiProvider) => {
    setTestStatus(prev => ({ ...prev, [provider]: 'testing' }));
    let keyToTest: string | undefined;
    if (provider === 'openai') keyToTest = openaiApiKey;
    if (provider === 'openrouter') keyToTest = openrouterApiKey;

    const result = await testAiConnection(provider, keyToTest);
    
    if (result.success) {
      setTestStatus(prev => ({ ...prev, [provider]: 'success' }));
    } else {
      setTestStatus(prev => ({ ...prev, [provider]: 'error' }));
    }
    setTimeout(() => setTestStatus(prev => ({...prev, [provider]: 'idle'})), 3000);
  };
  
  const getTestButtonText = (provider: AiProvider) => {
      switch (testStatus[provider]) {
          case 'testing': return 'Testing...';
          case 'success': return 'Success!';
          case 'error': return 'Failed!';
          default: return 'Test Connection';
      }
  };

  const getTestButtonClass = (provider: AiProvider) => {
      switch(testStatus[provider]) {
          case 'testing': return 'bg-gray-500';
          case 'success': return 'bg-green-600';
          case 'error': return 'bg-red-600';
          default: return 'bg-cyan-600 hover:bg-cyan-500';
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      webhookUrl,
      isAutoDiscoverEnabled: autoDiscover,
      autoDiscoverFrequency: Number(frequency) || 2,
      theme,
      aiProvider,
      openaiApiKey,
      openrouterApiKey,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-bold">Settings</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Configure application settings</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* --- AI Configuration --- */}
          <div className="space-y-4">
            <h4 className="text-md font-medium text-gray-800 dark:text-gray-200">AI Configuration</h4>
            <div className="grid grid-cols-3 gap-2 p-1 bg-gray-200 dark:bg-gray-700 rounded-lg">
                {(['gemini', 'openai', 'openrouter'] as AiProvider[]).map(p => (
                    <button type="button" key={p} onClick={() => setAiProvider(p)} className={`px-3 py-2 text-sm font-semibold rounded-md capitalize transition-colors duration-200 ${aiProvider === p ? 'bg-cyan-600 text-white shadow' : 'text-gray-600 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-black/20'}`}>
                        {p}
                    </button>
                ))}
            </div>
            
            <div className="p-4 bg-gray-100 dark:bg-gray-900/50 rounded-md space-y-3">
                {aiProvider === 'gemini' && (
                    <div>
                        <p className="text-sm text-gray-600 dark:text-gray-300">Uses the built-in Google Gemini model. The API key is configured on the server by the host.</p>
                         <button type="button" onClick={() => handleTest('gemini')} className={`mt-2 px-3 py-1.5 text-xs font-medium text-white rounded-md transition-colors duration-200 ${getTestButtonClass('gemini')}`}>
                            {getTestButtonText('gemini')}
                        </button>
                    </div>
                )}
                {aiProvider === 'openai' && (
                    <div>
                        <label htmlFor="openaiApiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">OpenAI API Key</label>
                        <div className="flex items-center space-x-2">
                           <input type="password" id="openaiApiKey" value={openaiApiKey} onChange={e => setOpenaiApiKey(e.target.value)} placeholder="sk-..." className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-cyan-500 focus:border-cyan-500"/>
                           <button type="button" onClick={() => handleTest('openai')} disabled={!openaiApiKey} className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors duration-200 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed ${getTestButtonClass('openai')}`}>
                               {getTestButtonText('openai')}
                           </button>
                        </div>
                    </div>
                )}
                {aiProvider === 'openrouter' && (
                    <div>
                        <label htmlFor="openrouterApiKey" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">OpenRouter API Key</label>
                        <div className="flex items-center space-x-2">
                           <input type="password" id="openrouterApiKey" value={openrouterApiKey} onChange={e => setOpenrouterApiKey(e.target.value)} placeholder="sk-or-..." className="w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-cyan-500 focus:border-cyan-500"/>
                           <button type="button" onClick={() => handleTest('openrouter')} disabled={!openrouterApiKey} className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors duration-200 disabled:bg-gray-400 dark:disabled:bg-gray-600 disabled:cursor-not-allowed ${getTestButtonClass('openrouter')}`}>
                              {getTestButtonText('openrouter')}
                           </button>
                        </div>
                    </div>
                )}
            </div>
          </div>
          
          {/* --- Theme --- */}
          <div>
            <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-2">Theme</h4>
            <label className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-900/50 rounded-md cursor-pointer">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 pr-4">
                  Enable Dark Mode
                </span>
                <div className="relative inline-flex items-center">
                    <input type="checkbox" checked={theme === 'dark'} onChange={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-cyan-300 dark:peer-focus:ring-cyan-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                </div>
            </label>
          </div>
          
          {/* --- Integrations --- */}
          <div>
            <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-2">Integrations</h4>
            <label htmlFor="webhookUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Discord Webhook URL</label>
            <input type="url" id="webhookUrl" value={webhookUrl} onChange={e => setWebhookUrl(e.target.value)} placeholder="https://discord.com/api/webhooks/..." className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-cyan-500 focus:border-cyan-500" aria-describedby="webhook-description"/>
            <p id="webhook-description" className="mt-2 text-xs text-gray-500 dark:text-gray-400">This allows the app to send reminders and summaries directly to your Discord channel.</p>
          </div>

          {/* --- Automated Discovery --- */}
          <div className="space-y-4">
             <h4 className="text-md font-medium text-gray-800 dark:text-gray-200">Automated Event Discovery</h4>
             <label className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-900/50 rounded-md cursor-pointer">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 pr-4">
                  Enable automatic background search
                </span>
                <div className="relative inline-flex items-center">
                    <input type="checkbox" checked={autoDiscover} onChange={e => setAutoDiscover(e.target.checked)} className="sr-only peer" />
                    <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 rounded-full peer peer-focus:ring-2 peer-focus:ring-cyan-300 dark:peer-focus:ring-cyan-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-600"></div>
                </div>
            </label>
             {autoDiscover && (
                <div>
                  <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Run discovery every (days)</label>
                  <input type="number" id="frequency" value={frequency} onChange={e => setFrequency(parseInt(e.target.value, 10))} min="1" className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-cyan-500 focus:border-cyan-500" aria-describedby="frequency-description"/>
                  <p id="frequency-description" className="mt-2 text-xs text-gray-500 dark:text-gray-400">The server will automatically check for new events in the background. If any are found, a notification will be sent to your Discord channel.</p>
                </div>
              )}
          </div>
          
          <div className="pt-4 flex justify-end space-x-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors duration-200">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 rounded-md hover:bg-cyan-500 transition-colors duration-200">Save Settings</button>
          </div>
        </form>
      </div>
    </div>
  );
};